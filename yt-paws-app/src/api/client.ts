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
}

export const petsApi = {
  list: (token: string) => request<Pet[]>('/pets', {}, token),

  create: (token: string, data: { name: string; species?: string }) =>
    request<Pet>('/pets', { method: 'POST', body: JSON.stringify(data) }, token),
};

export interface Booking {
  id: string;
  businessId: string;
  customerId: string;
  petId: string;
  serviceId: string;
  status: string;
  startDate: string;
  endDate: string;
}

export const bookingsApi = {
  create: (
    token: string,
    data: { serviceId: string; petId: string; startDate: string; endDate: string },
  ) => request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(data) }, token),
};
