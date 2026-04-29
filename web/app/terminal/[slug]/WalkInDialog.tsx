"use client";

import { useState, useEffect } from "react";
import { getBays, getServices, createWalkIn, type BayOption, type ServiceOption } from "@/lib/terminal-api";
import { getAccessToken } from "@/lib/auth";

interface Props {
  slug: string;
  onClose: () => void;
  onSuccess: () => void;
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h < 18; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

export default function WalkInDialog({ slug, onClose, onSuccess }: Props) {
  const [bays, setBays] = useState<BayOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const localDate = now.toISOString().split("T")[0];
  const currentMinutes = now.getMinutes();
  const roundedTime = `${String(now.getHours()).padStart(2, "0")}:${currentMinutes < 30 ? "00" : "30"}`;
  const initialTime = TIME_SLOTS.includes(roundedTime) ? roundedTime : "08:00";

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    serviceId: "",
    bayId: "",
    date: localDate,
    time: initialTime,
    notes: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const [b, s] = await Promise.all([getBays(slug), getServices(slug)]);
        setBays(b);
        setServices(s);
        if (b.length > 0) setForm(f => ({ ...f, bayId: b[0].id }));
        if (s.length > 0) setForm(f => ({ ...f, serviceId: s[0].id }));
      } catch {
        setError("Greška pri učitavanju podataka.");
      }
    }
    load();
  }, [slug]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit() {
    if (!form.customerName || !form.customerPhone || !form.customerEmail || !form.serviceId || !form.bayId) {
      setError("Sva obavezna polja moraju biti popunjena.");
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      await createWalkIn({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        serviceId: form.serviceId,
        bayId: form.bayId,
        startsAt: new Date(`${form.date}T${form.time}:00`).toISOString(),
        notes: form.notes || undefined,
        createdBy: "Worker",
      }, token);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Greška pri kreiranju rezervacije.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-xl font-bold">Walk-in rezervacija</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <Field label="Ime i prezime *">
            <input name="customerName" value={form.customerName} onChange={handleChange}
              className="input-field" placeholder="Marko Marković" />
          </Field>

          <Field label="Telefon *">
            <input name="customerPhone" value={form.customerPhone} onChange={handleChange}
              className="input-field" placeholder="+381601234567" />
          </Field>

          <Field label="Email *">
            <input name="customerEmail" type="email" value={form.customerEmail} onChange={handleChange}
              className="input-field" placeholder="marko@email.com" />
          </Field>

          <Field label="Usluga *">
            <select name="serviceId" value={form.serviceId} onChange={handleChange} className="input-field">
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.priceRsd.toLocaleString("sr-Latn-RS")} RSD</option>
              ))}
            </select>
          </Field>

          <Field label="Boks *">
            <select name="bayId" value={form.bayId} onChange={handleChange} className="input-field">
              {bays.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Datum i vreme *">
            <div className="flex gap-3">
              <Field label="Datum *">
                <input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleChange}
                  min={localDate}
                  className="input-field"
                />
              </Field>
              <Field label="Vreme *">
                <select name="time" value={form.time} onChange={handleChange} className="input-field">
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Field>

          <Field label="Napomena">
            <textarea name="notes" value={form.notes} onChange={handleChange}
              className="input-field resize-none" rows={2} placeholder="Opciono..." />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-800">
          <button onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl transition-colors">
            Otkaži
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
            {loading ? "Kreiranje..." : "Kreiraj rezervaciju"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}