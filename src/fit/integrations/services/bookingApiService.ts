// HTTP client for Wellhub Booking API (outbound calls from our system to Wellhub)
// Sandbox base URL is used unless WELLHUB_ENV=production is set.

const BASE_URL = process.env.WELLHUB_ENV === 'production'
  ? 'https://api.partners.gympass.com/booking/v1'
  : 'https://apitesting.partners.gympass.com/booking/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WellhubInstructor {
  name: string;
  substitute: boolean;
}

export interface WellhubBookingWindow {
  opens_at?: string;
  closes_at?: string;
}

export interface CreateClassPayload {
  name: string;
  description: string;
  notes?: string;
  bookable: boolean;
  visible: boolean;
  product_id: number;
  is_virtual?: boolean;
  reference?: string;
  system_id?: number;
  categories?: number[];
}

export interface UpdateClassPayload {
  name: string;
  description: string;
  notes?: string;
  bookable: boolean;
  visible: boolean;
  product_id: number;
  reference?: string;
  categories?: number[];
}

export interface CreateSlotPayload {
  occur_date: string;
  length_in_minutes: number;
  total_capacity: number;
  total_booked: number;
  product_id: number;
  status?: 0 | 1;
  room?: string;
  booking_window?: WellhubBookingWindow;
  cancellable_until?: string;
  instructors?: WellhubInstructor[];
  rate?: number;
  virtual?: boolean;
  virtual_class_url?: string;
}

export interface PatchSlotPayload {
  total_capacity?: number;
  total_booked?: number;
  virtual_class_url?: string;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function request<T = any>(
  method: string,
  path: string,
  apiKey: string,
  body?: unknown,
): Promise<T | null> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });

  if (res.status === 204) return null;

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(`Wellhub API ${res.status} ${method} ${path}: ${text}`);
  }

  return json;
}

// ─── Classes ──────────────────────────────────────────────────────────────────

export async function createWellhubClass(gymId: string, apiKey: string, data: CreateClassPayload) {
  return request('POST', `/gyms/${gymId}/classes`, apiKey, { classes: [data] });
}

export async function listWellhubClasses(gymId: string, apiKey: string) {
  return request('GET', `/gyms/${gymId}/classes`, apiKey);
}

export async function updateWellhubClass(gymId: string, classId: number, apiKey: string, data: UpdateClassPayload) {
  return request('PUT', `/gyms/${gymId}/classes/${classId}`, apiKey, data);
}

// ─── Slots ────────────────────────────────────────────────────────────────────

export async function createWellhubSlot(gymId: string, classId: number, apiKey: string, data: CreateSlotPayload) {
  return request('POST', `/gyms/${gymId}/classes/${classId}/slots`, apiKey, data);
}

export async function listWellhubSlots(
  gymId: string,
  classId: number,
  apiKey: string,
  from?: string,
  to?: string,
) {
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const q = qs.toString() ? `?${qs}` : '';
  return request('GET', `/gyms/${gymId}/classes/${classId}/slots${q}`, apiKey);
}

export async function patchWellhubSlot(
  gymId: string,
  classId: number,
  slotId: number,
  apiKey: string,
  data: PatchSlotPayload,
) {
  return request('PATCH', `/gyms/${gymId}/classes/${classId}/slots/${slotId}`, apiKey, data);
}

export async function deleteWellhubSlot(gymId: string, classId: number, slotId: number, apiKey: string) {
  return request('DELETE', `/gyms/${gymId}/classes/${classId}/slots/${slotId}`, apiKey);
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

// status: 2 = Reserved (confirmed), 3 = Rejected
export async function validateWellhubBooking(
  gymId: string,
  bookingNumber: string,
  classId: number,
  apiKey: string,
  status: 2 | 3,
  reason?: string,
) {
  const body: Record<string, unknown> = { class_id: classId, status };
  if (reason) body.reason = reason;
  return request('PATCH', `/gyms/${gymId}/bookings/${bookingNumber}`, apiKey, body);
}
