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

const devHost = resolveDevHost();
const BASE_URL = devHost
  ? `http://${devHost}:${API_PORT}`
  : Platform.select({ android: `http://10.0.2.2:${API_PORT}`, default: `http://localhost:${API_PORT}` });

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

  registerBusiness: (
    businessName: string,
    email: string,
    password: string,
    name: string,
    phone?: string,
  ) =>
    request<AuthResponse>('/auth/register-business', {
      method: 'POST',
      body: JSON.stringify({ businessName, email, password, name, phone }),
    }),
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
  isActive: boolean;
}

export const servicesApi = {
  list: (token: string) => request<Service[]>('/services', {}, token),
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
  // Same interim base64-data-URI approach as DailyReport.mediaUrls — see
  // docs/03_System_Architecture.md §5.3.
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

export const bookingsApi = {
  create: (
    token: string,
    data: { serviceId: string; petId: string; startDate: string; endDate: string },
  ) => request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(data) }, token),

  mine: (token: string) => request<Booking[]>('/bookings/mine', {}, token),

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
  status: 'pending' | 'pending_verification' | 'paid' | 'failed' | 'refunded';
  referenceNote: string | null;
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
};

export interface StaffMember {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
}

export const staffApi = {
  list: (token: string) => request<StaffMember[]>('/auth/staff', {}, token),

  create: (token: string, data: { email: string; name: string; phone?: string }) =>
    request<{ user: StaffMember; temporaryPassword: string }>(
      '/auth/staff',
      { method: 'POST', body: JSON.stringify(data) },
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

  unregisterDevice: (token: string) =>
    request<{ registered: boolean }>('/notifications/unregister-device', { method: 'PATCH' }, token),
};
