const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Service {
    id: string;
    name: string;
    vehicleCategory: string;
    serviceType: string;
    durationMinutes: number;
    priceRsd: number;
}

export interface Timeslot {
   startsAt: string;
    endsAt: string;
    bayId: string;
    bayName: string;
}

export interface CreateReservationPayload {
    bayId: string;
    serviceId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    startsAt: string; 
    notes?: string;
    createdBy: "Customer";
    tenantSlug: string;
}

export interface ReservationResult {
    id: string;
    serviceName: string;
    startsAt: string;
    customerName: string;
    customerEmail: string;
}

export async function getServices(slug: string): Promise<Service[]> {
    const res = await fetch(`${API_URL}/services?tenantSlug=${slug}`, {
        cache: "no-store",
    });

    if (!res.ok) throw new Error("Failed to fetch services");
    return res.json();
}


export async function getAvailability(slug: string, date: string, serviceId: string): Promise<Timeslot[]> {
    const res = await fetch(`${API_URL}/availability?tenantSlug=${slug}&date=${date}&serviceId=${serviceId}`, {
        cache: "no-store",
    });

    if (!res.ok) throw new Error("Failed to fetch availability");
    return res.json();
}

export async function createReservation(payload: CreateReservationPayload): Promise<ReservationResult> {
    const res = await fetch(`${API_URL}/reservations`, {
        method: "POST",
        headers: {"Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Failed to create reservation");
    return res.json();
}