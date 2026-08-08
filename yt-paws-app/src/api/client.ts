import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = 3000;

// A physical device can't reach "localhost" (that's the phone itself), and
// the Android-emulator-only "10.0.2.2" alias doesn't help on a real phone
// either. Expo exposes the host the device used to reach the Metro dev
// server as "<ip>:8081" — reuse that host for the API too, since the
// backend runs on the same dev machine.
function resolveDevHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  return hostUri?.split(':')[0] ?? null;
}

// EXPO_PUBLIC_-prefixed env vars are inlined into the JS bundle at build
// time (Expo SDK 49+, no extra config needed) — set per environment via
// eas.json's per-profile `env`, or a local .env.* file. This is the only
// way a standalone (non-Metro) build reaches a real backend; without it,
// the dev-host/localhost fallback below would make a production build
// silently try to talk to the phone it's running on.
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
export const PUBLIC_WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || configuredApiUrl || 'http://localhost:3000').replace(/\/$/, '');

const devHost = resolveDevHost();
const BASE_URL =
  configuredApiUrl ||
  (devHost
    ? `http://${devHost}:${API_PORT}`
    : Platform.select({ android: `http://10.0.2.2:${API_PORT}`, default: `http://localhost:${API_PORT}` }));

if (!configuredApiUrl && !__DEV__) {
  // A release JS bundle (EAS preview/production build, or `expo export`)
  // has no Metro dev server to infer a host from, so devHost is always
  // null here — this only fires when EXPO_PUBLIC_API_URL was left unset
  // for a non-dev build, which otherwise fails silently (every request
  // just times out against the phone's own loopback address).
  console.error(
    'EXPO_PUBLIC_API_URL is not set for this build — the app cannot reach a backend. ' +
      "Set it in eas.json's env for this build profile before distributing this build.",
  );
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.message ?? 'Request failed';
    throw new ApiError(response.status, Array.isArray(message) ? message[0] : message);
  }

  return body as T;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  mustChangePassword: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  register: (email: string, password: string, name: string, phone?: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, phone }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  forgotPassword: (email: string) =>
    request<{ accepted: true }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (resetToken: string, newPassword: string) =>
    request<{ reset: true }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: resetToken, newPassword }),
    }),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<AuthResponse>(
      '/auth/change-password',
      { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) },
      token,
    ),

  deleteAccount: (token: string, password: string) =>
    request<{ deleted: true }>(
      '/auth/account',
      { method: 'DELETE', body: JSON.stringify({ password }) },
      token,
    ),

};

export type MediaPurpose = 'pet' | 'report' | 'wechat-qr';

export const mediaApi = {
  upload: async (token: string, localUri: string, purpose: MediaPurpose, contentType = 'image/jpeg') => {
    const fileResponse = await fetch(localUri);
    const blob = await fileResponse.blob();
    if (blob.size > 5 * 1024 * 1024) throw new ApiError(413, 'Image must be 5 MB or smaller');
    const signed = await request<{ uploadUrl: string; publicUrl: string }>(
      '/media/upload-url',
      { method: 'POST', body: JSON.stringify({ purpose, contentType, size: blob.size }) },
      token,
    );
    const uploadResponse = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    });
    if (!uploadResponse.ok) throw new ApiError(uploadResponse.status, 'Media upload failed');
    return signed.publicUrl;
  },
};

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: number;
  // 'flat': price is a one-off charge for the whole booking (e.g. grooming).
  // 'per_day': price is multiplied by the number of days in the booking's
  // date range (e.g. boarding).
  pricingUnit: 'flat' | 'per_day';
  durationMinutes: number | null;
  maxConcurrentBookings: number | null;
  isActive: boolean;
}

export interface ServiceInput {
  name: string;
  description?: string;
  price: number;
  pricingUnit?: 'flat' | 'per_day';
  durationMinutes?: number;
  maxConcurrentBookings?: number | null;
}

export interface ServiceUpdateInput extends Partial<ServiceInput> {
  isActive?: boolean;
}

export const servicesApi = {
  // For a customer, only active services; for owner/staff, every service on
  // their business (including delisted ones, so they can re-publish them).
  list: (token: string) => request<Service[]>('/services', {}, token),

  // Owner/admin only.
  create: (token: string, data: ServiceInput) =>
    request<Service>('/services', { method: 'POST', body: JSON.stringify(data) }, token),

  // Owner/admin only.
  update: (token: string, serviceId: string, data: ServiceUpdateInput) =>
    request<Service>(`/services/${serviceId}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
};

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: string | null;
  breed: string | null;
  age: number | null;
  weight: number | null;
  personality: string | null;
  dietNotes: string | null;
  isNeutered: boolean | null;
  // HTTPS object-storage URL.
  photoUrl: string | null;
}

export interface PetUpdateInput {
  name?: string;
  species?: string;
  breed?: string;
  age?: number;
  weight?: number;
  personality?: string;
  dietNotes?: string;
  isNeutered?: boolean;
  photoUrl?: string;
}

export interface PetHealthRecord {
  id: string;
  petId: string;
  type: string;
  date: string;
  nextDate: string | null;
  notes: string | null;
}

export const petsApi = {
  list: (token: string) => request<Pet[]>('/pets', {}, token),

  create: (token: string, data: { name: string; species?: string; photoUrl?: string }) =>
    request<Pet>('/pets', { method: 'POST', body: JSON.stringify(data) }, token),

  update: (token: string, petId: string, data: PetUpdateInput) =>
    request<Pet>(`/pets/${petId}`, { method: 'PATCH', body: JSON.stringify(data) }, token),

  listHealthRecords: (token: string, petId: string) =>
    request<PetHealthRecord[]>(`/pets/${petId}/health-records`, {}, token),

  addHealthRecord: (
    token: string,
    petId: string,
    data: { type: string; date: string; nextDate?: string; notes?: string },
  ) =>
    request<PetHealthRecord>(
      `/pets/${petId}/health-records`,
      { method: 'POST', body: JSON.stringify(data) },
      token,
    ),
};

export interface Booking {
  id: string;
  businessId: string;
  customerId: string;
  assignedStaffId: string | null;
  petId: string;
  serviceId: string;
  status: string;
  startDate: string;
  endDate: string;
  // Only present on responses from bookingsApi.mine(), which joins these in.
  pet?: { name: string };
  service?: { name: string };
}

export interface BookingCareDetails {
  pet: Pet & { healthRecords: PetHealthRecord[] };
  customer: { name: string | null; email: string; phone: string | null };
}

export const bookingsApi = {
  create: (
    token: string,
    data: { serviceId: string; petId: string; startDate: string; endDate: string },
  ) => request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(data) }, token),

  mine: (token: string) => request<Booking[]>('/bookings/mine', {}, token),

  careDetails: (token: string, bookingId: string) =>
    request<BookingCareDetails>(`/bookings/${bookingId}/care-details`, {}, token),

  cancel: (token: string, bookingId: string) =>
    request<Booking>(`/bookings/${bookingId}/cancel`, { method: 'PATCH' }, token),

  // Owner/admin only. Forward-only: pending -> confirmed -> in_progress -> completed.
  updateStatus: (token: string, bookingId: string, status: string) =>
    request<Booking>(
      `/bookings/${bookingId}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      token,
    ),

  // Owner/admin only. staffId must belong to the same business as the booking.
  assign: (token: string, bookingId: string, staffId: string) =>
    request<Booking>(
      `/bookings/${bookingId}/assign`,
      { method: 'PATCH', body: JSON.stringify({ staffId }) },
      token,
    ),
};

export interface DailyReport {
  id: string;
  bookingId: string;
  text: string | null;
  mediaUrls: string[];
  createdAt: string;
}

export const reportsApi = {
  listForBooking: (token: string, bookingId: string) =>
    request<DailyReport[]>(`/reports/${bookingId}`, {}, token),

  // Only allowed while the booking is in_progress, by the assigned staff
  // member or the business's owner/admin (see reports.service.ts).
  create: (token: string, bookingId: string, data: { text?: string; mediaUrls?: string[] }) =>
    request<DailyReport>(
      `/reports/${bookingId}`,
      { method: 'POST', body: JSON.stringify(data) },
      token,
    ),
};

export interface Payment {
  id: string;
  bookingId: string;
  method: 'stripe' | 'wechat_qr';
  amount: number;
  status: 'pending' | 'pending_verification' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'refund_pending';
  referenceNote: string | null;
  refundReason?: string | null;
  createdAt: string;
  // Only present on responses from paymentsApi.mine()/business(), which
  // join these in; business() additionally joins the customer's name/email.
  booking?: {
    id: string;
    startDate: string;
    service?: { name: string };
    customer?: { name: string | null; email: string };
  };
}

export interface WechatPaymentIntent {
  paymentId: string;
  amount: number;
  referenceNote: string | null;
  qrCodeUrl: string | null;
  status: 'pending' | 'pending_verification';
}

export interface StripeCheckoutIntent {
  paymentId: string;
  amount: number;
  checkoutUrl: string;
}

export const paymentsApi = {
  // Idempotent: reuses an existing pending/pending_verification wechat_qr
  // payment for this booking instead of creating a duplicate.
  initiateWechat: (token: string, bookingId: string) =>
    request<WechatPaymentIntent>(`/payments/wechat/${bookingId}`, { method: 'POST' }, token),

  markPaid: (token: string, paymentId: string) =>
    request<Payment>(`/payments/${paymentId}/mark-paid`, { method: 'PATCH' }, token),

  mine: (token: string) => request<Payment[]>('/payments/mine', {}, token),

  // Owner/admin only.
  business: (token: string) => request<Payment[]>('/payments/business', {}, token),

  // Owner/admin only. Confirms a pending_verification WeChat transfer as paid.
  verify: (token: string, paymentId: string) =>
    request<Payment>(`/payments/${paymentId}/verify`, { method: 'PATCH' }, token),

  // Owner/admin only. Full refund only — no partial amounts in V1. `reason`
  // is required (surfaced to the customer and kept for audit).
  refund: (token: string, paymentId: string, reason: string) =>
    request<Payment>(
      `/payments/${paymentId}/refund`,
      { method: 'PATCH', body: JSON.stringify({ reason }) },
      token,
    ),

  // Owner/admin recovery path for a Stripe refund left in refund_pending.
  reconcileRefund: (token: string, paymentId: string) =>
    request<Payment>(`/payments/${paymentId}/reconcile-refund`, { method: 'POST' }, token),

  // Creates a Stripe Checkout Session; returnUrl is where the hosted page
  // redirects back to (see src/screens/PaymentScreen.tsx, which builds it
  // via Linking.createURL and opens checkoutUrl with openAuthSessionAsync).
  initiateStripe: (token: string, bookingId: string, returnUrl: string) =>
    request<StripeCheckoutIntent>(
      `/payments/stripe/${bookingId}`,
      { method: 'POST', body: JSON.stringify({ returnUrl }) },
      token,
    ),

  // Polls a single payment's current status — used after returning from
  // the Checkout browser session, since the redirect itself isn't proof of
  // payment (only the webhook, server-side, is).
  getOne: (token: string, paymentId: string) => request<Payment>(`/payments/${paymentId}`, {}, token),
};

export interface StaffMember {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  maxConcurrentBookings: number | null;
}

export interface Business {
  id: string;
  name: string;
  region: string | null;
  wechatQrCodeUrl: string | null;
  maxConcurrentBookings: number | null;
}

export interface BusinessUpdateInput {
  name?: string;
  // null clears the field; undefined/omitted leaves it unchanged.
  region?: string | null;
  wechatQrCodeUrl?: string | null;
  maxConcurrentBookings?: number | null;
}

export const businessesApi = {
  // Owner/admin only.
  getMine: (token: string) => request<Business>('/businesses/me', {}, token),

  // Owner/admin only.
  updateMine: (token: string, data: BusinessUpdateInput) =>
    request<Business>('/businesses/me', { method: 'PATCH', body: JSON.stringify(data) }, token),
};

export const staffApi = {
  list: (token: string) => request<StaffMember[]>('/auth/staff', {}, token),

  create: (token: string, data: { email: string; name: string; phone?: string }) =>
    request<{ user: StaffMember; temporaryPassword: string }>(
      '/auth/staff',
      { method: 'POST', body: JSON.stringify(data) },
      token,
    ),

  updateStatus: (token: string, staffId: string, isActive: boolean) =>
    request<StaffMember>(
      `/auth/staff/${staffId}/status`,
      { method: 'PATCH', body: JSON.stringify({ isActive }) },
      token,
    ),

  updateCapacity: (token: string, staffId: string, maxConcurrentBookings: number | null) =>
    request<StaffMember>(
      `/auth/staff/${staffId}/capacity`,
      { method: 'PATCH', body: JSON.stringify({ maxConcurrentBookings }) },
      token,
    ),
};

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export const notificationsApi = {
  mine: (token: string) => request<AppNotification[]>('/notifications/mine', {}, token),

  markRead: (token: string, id: string) =>
    request<AppNotification>(`/notifications/${id}/read`, { method: 'PATCH' }, token),

  registerDevice: (token: string, pushToken: string) =>
    request<{ registered: boolean }>(
      '/notifications/register-device',
      { method: 'PATCH', body: JSON.stringify({ pushToken }) },
      token,
    ),

  unregisterDevice: (token: string, pushToken: string) =>
    request<{ registered: boolean }>(
      '/notifications/unregister-device',
      { method: 'PATCH', body: JSON.stringify({ pushToken }) },
      token,
    ),
};
