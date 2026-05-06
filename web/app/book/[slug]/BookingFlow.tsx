"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    getServices,
    getAvailability,
    createReservation,
    Service,
    Timeslot
} from "@/lib/booking-api";

interface Props {
    slug: string;
}

type Step = 1 | 2 | 3 | 4;

export default function BookingFlow({ slug }: Props) {
    const router = useRouter();

    const [step, setStep] = useState<Step>(1);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [slots, setSlots] = useState<Timeslot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<Timeslot | null>(null);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Step 1 — Load and pick service
const loadServices = async () => {
    setLoading(true);
    setError("");
    try {
        const data = await getServices(slug);
        setServices(data);
    } catch {
        setError("Failed to load services");
    } finally {
        setLoading(false);
    }
};

const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setStep(2);
};

    // Step 2 — Pick date and timeslot
    const handleSelectDate = async () => {
        if ( !selectedDate || !selectedService) return;
        setLoading(true);
        setError("");
        try {
            const data = await getAvailability(slug, selectedDate, selectedService.id);
            setSlots(data);
            setStep(3);
        } catch {
            setError("Failed to load availability");
        } finally {
            setLoading(false);
        }
    };

    // Step 3 — Pick slot

    const handleSelectSlot = (slot: Timeslot) => {
        setSelectedSlot(slot);
        setStep(4);
    };
    
    // Step 4 — Submit reservation
    const handleSubmit = async () => {
        if (!selectedService || !selectedSlot) return;
        setLoading(true);
        setError("");
        try {
           const result =  await createReservation({
                bayId: selectedSlot.bayId,
                serviceId: selectedService.id,
                customerName,
                customerPhone,
                customerEmail,
                startsAt: selectedSlot.startsAt,
                notes : notes || undefined,
                createdBy: "Customer",
                tenantSlug: slug,
            });
            router.push(
                `/book/${slug}/success?name=${encodeURIComponent(customerName)}&service=${encodeURIComponent(selectedService.name)}&startsAt=${encodeURIComponent(selectedSlot.startsAt)}&email=${encodeURIComponent(customerEmail)}`);
        } catch (e) {
            setError("Failed to create reservation. Try again later.");
        } finally {
            setLoading(false);
        }
    };

    // Render logic based on step

     return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Rezervacija</h1>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        {/* Step 1 — Odaberi uslugu */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-gray-600">Odaberite uslugu:</p>
            {services.length === 0 && !loading && (
              <button
                onClick={loadServices}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Učitaj usluge
              </button>
            )}
            {loading && <p className="text-gray-400">Učitavanje...</p>}
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectService(s)}
                className="w-full text-left border rounded-xl p-4 hover:border-blue-500 transition"
              >
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm text-gray-500">{s.durationMinutes} min · {s.priceRsd} RSD</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — Odaberi datum */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-gray-600">Odaberite datum:</p>
            <input
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border rounded-lg p-2"
            />
            <button
              onClick={handleSelectDate}
              disabled={!selectedDate || loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Učitavanje..." : "Dalje"}
            </button>
            <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:underline">
              ← Nazad
            </button>
          </div>
        )}

        {/* Step 3 — Odaberi slot */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-gray-600">Odaberite termin:</p>
            {slots.length === 0 && (
              <p className="text-gray-400 text-sm">Nema slobodnih termina za odabrani datum.</p>
            )}
            {slots.map((slot) => (
              <button
                key={slot.startsAt}
                onClick={() => handleSelectSlot(slot)}
                className="w-full text-left border rounded-xl p-4 hover:border-blue-500 transition"
              >
                {new Date(slot.startsAt).toLocaleTimeString("sr-RS", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </button>
            ))}
            <button onClick={() => setStep(2)} className="text-sm text-gray-400 hover:underline">
              ← Nazad
            </button>
          </div>
        )}

        {/* Step 4 — Unesi podatke */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-gray-600">Vaši podaci:</p>
            <input
              type="text"
              placeholder="Ime i prezime"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border rounded-lg p-2"
            />
            <input
              type="tel"
              placeholder="Telefon"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full border rounded-lg p-2"
            />
            <input
              type="email"
              placeholder="Email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full border rounded-lg p-2"
            />
            <textarea
              placeholder="Napomena (opciono)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg p-2"
              rows={3}
            />
            <button
              onClick={handleSubmit}
              disabled={!customerName || !customerPhone || !customerEmail || loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Slanje..." : "Potvrdi rezervaciju"}
            </button>
            <button onClick={() => setStep(3)} className="text-sm text-gray-400 hover:underline">
              ← Nazad
            </button>
          </div>
        )}
      </div>
    </div>
  );
}