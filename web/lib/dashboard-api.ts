import { apiFetch } from "@/lib/api";

export type BayItem = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ReservationItem = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: number;
  notes: string | null;
  createdBy: string;
  bay: { id: string; name: string };
  service: { id: string; name: string; durationMinutes: number; priceRsd: number };
  customer: { id: string; name: string; phone: string };
};

export type StatsResponse = {
  today: {
    total: number;
    completed: number;
    cancelled: number;
    pending: number;
    revenueRsd: number;
  };
  month: {
    total: number;
    completed: number;
    revenueRsd: number;
  };
};

export async function getDashboardReservations(date: string): Promise<ReservationItem[]> {
  return apiFetch<ReservationItem[]>(`/reservations?date=${date}`);
}

export async function getDashboardBays(): Promise<BayItem[]> {
  return apiFetch<BayItem[]>(`/bays`);
}

export async function getDashboardStats(date: string): Promise<StatsResponse> {
  return apiFetch<StatsResponse>(`/reservations/stats?date=${date}`);
}

export async function createBay(name: string): Promise<BayItem> {
  return apiFetch<BayItem>(`/bays`, { method: "POST", body: { name } });
}

export async function updateBay(id: string, data: { name?: string; isActive?: boolean }): Promise<BayItem> {
  return apiFetch<BayItem>(`/bays/${id}`, { method: "PATCH", body: data });
}

export async function deleteBay(id: string): Promise<void> {
  return apiFetch<void>(`/bays/${id}`, { method: "DELETE" });
}

export type ServiceItem = {
  id: string;
  name: string;
  vehicleCategory: string;
  serviceType: string;
  durationMinutes: number;
  priceRsd: number;
  isActive: boolean;
};

export async function getServices(): Promise<ServiceItem[]> {
  return apiFetch<ServiceItem[]>(`/services/manage`);
}

export async function createService(data: {
  name: string;
  vehicleCategory: string;
  serviceType: string;
  durationMinutes: number;
  priceRsd: number;
}): Promise<ServiceItem> {
  return apiFetch<ServiceItem>(`/services`, { method: "POST", body: data });
}

export async function toggleService(id: string, isActive: boolean): Promise<ServiceItem> {
  return apiFetch<ServiceItem>(`/services/${id}`, { method: "PATCH", body: { isActive } });
}

export async function deactivateService(id: string): Promise<void> {
  return apiFetch<void>(`/services/${id}`, { method: "DELETE" });
}