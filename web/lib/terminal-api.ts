import { apiFetch } from "./api";

export type ReservationStatus = 0 | 1 | 2 | 3 | 4;
// 0=Pending, 1=Confirmed, 2=InProgress, 3=Completed, 4=Cancelled

export interface TerminalReservation {
  id: string;
  startsAt: string;
  endsAt: string;
  status: ReservationStatus;
  notes?: string;
  createdBy: string;
  bay: { id: string; name: string };
  service: { id: string; name: string; durationMinutes: number; priceRsd: number };
  customer: { id: string; name: string; phone: string };
}

export interface BayOption {
  id: string;
  name: string;
}

export interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
  priceRsd: number;
}

export interface WalkInPayload {
  bayId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  startsAt: string;
  notes?: string;
  createdBy: "Worker";
}

export async function getReservations(
  date: string,
  token: string
): Promise<TerminalReservation[]> {
  return apiFetch<TerminalReservation[]>(`/reservations?date=${date}`, { token });
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus,
  token: string
): Promise<void> {
  return apiFetch<void>(`/reservations/${id}/status`, {
    method: "PATCH",
    body: { status },
    token,
  });
}

export async function cancelReservation(
  id: string,
  token: string
): Promise<void> {
  return apiFetch<void>(`/reservations/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function getBays(tenantSlug: string): Promise<BayOption[]> {
  return apiFetch<BayOption[]>(`/bays?tenantSlug=${tenantSlug}`);
}

export async function getServices(tenantSlug: string): Promise<ServiceOption[]> {
  return apiFetch<ServiceOption[]>(`/services?tenantSlug=${tenantSlug}`);
}

export async function createWalkIn(
  payload: WalkInPayload,
  token: string
): Promise<{ id: string; status: ReservationStatus }> {
  return apiFetch(`/reservations`, {
    method: "POST",
    body: payload,
    token,
  });
}