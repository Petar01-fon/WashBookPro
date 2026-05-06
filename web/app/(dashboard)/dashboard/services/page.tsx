"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth";
import {
  getServices,
  createService,
  toggleService,
  deactivateService,
} from "@/lib/dashboard-api";
import { Plus, Pencil, PowerOff, Power } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxInput } from "@/components/ui/combobox-input";

type Service = {
  id: string;
  name: string;
  vehicleCategory: string;
  serviceType: string;
  durationMinutes: number;
  priceRsd: number;
  isActive: boolean;
};

// const VEHICLE_CATEGORIES = ["Car", "SUV", "Van"];
// const SERVICE_TYPES = ["Basic", "Deep"];

const categoryLabel: Record<string, string> = {
  Car: "Automobil",
  SUV: "SUV",
  Van: "Kombi",
};

const typeLabel: Record<string, string> = {
  Basic: "Obično pranje",
  Deep: "Dubinsko pranje",
};


export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    vehicleCategory: "Car",
    serviceType: "Basic",
    durationMinutes: "",
    priceRsd: "",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    // const token = getAccessToken();
    // if (!token) return;
    try {
      const data = await getServices();
      setServices(data);
    } finally {
      setLoading(false);
    }
  }
 

  useEffect(() => { load(); }, []);

async function handleCreate() {
  setSaving(true);
  try {
    await createService({
      name: form.name,
      vehicleCategory: form.vehicleCategory,
      serviceType: form.serviceType,
      durationMinutes: Number(form.durationMinutes),
      priceRsd: Number(form.priceRsd),
    });
    setDialogOpen(false);
    setForm({ name: "", vehicleCategory: "", serviceType: "", durationMinutes: "", priceRsd: "" });
    await load();
  } catch (err) {
    console.error("Greška pri kreiranju usluge:", err);
    alert("Greška pri čuvanju. Pogledaj konzolu.");
  } finally {
    setSaving(false);
  }
}

  async function handleToggle(service: Service) {
    // const token = getAccessToken();
    // if (!token) return;
    await toggleService(service.id, !service.isActive);
    await load();
  }
  const existingCategories = [...new Set(services.map((s) => s.vehicleCategory))];
  const existingTypes = [...new Set(services.map((s) => s.serviceType))];

  // Grupiši po kategoriji
  const grouped = existingCategories.map((cat) => ({
    category: cat,
    services: services.filter((s) => s.vehicleCategory === cat),
  }));


  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Usluge</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova usluga
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Učitavanje...</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, services: catServices }) => (
            <div key={category}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
                {categoryLabel[category]}
              </h2>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Naziv</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Tip</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Trajanje</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Cena</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {catServices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center text-gray-400">
                          Nema usluga
                        </td>
                      </tr>
                    ) : (
                      catServices.map((s) => (
                        <tr key={s.id} className={s.isActive ? "" : "opacity-50"}>
                          <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                          <td className="px-4 py-3 text-gray-600">{typeLabel[s.serviceType] ?? s.serviceType}</td>
                          <td className="px-4 py-3 text-gray-600">{s.durationMinutes} min</td>
                          <td className="px-4 py-3 text-gray-600">{s.priceRsd.toLocaleString("sr-RS")} RSD</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              s.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}>
                              {s.isActive ? "Aktivna" : "Neaktivna"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleToggle(s)}
                              className="rounded p-1 text-gray-400 hover:text-gray-700"
                              title={s.isActive ? "Deaktiviraj" : "Aktiviraj"}
                            >
                              {s.isActive ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog — nova usluga */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova usluga</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Naziv</Label>
              <Input
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
                placeholder="npr. Automobil — obično pranje"
              />
            </div>
            <div>
                <Label>Kategorija</Label>
                <ComboboxInput
                    value={form.vehicleCategory}
                    onChange={(v) => setForm({ ...form, vehicleCategory: v })}
                    options={existingCategories}
                    placeholder="Izaberi kategoriju..."
                />
            </div>
            <div>
                <Label>Tip usluge</Label>
                <ComboboxInput
                    value={form.serviceType}
                    onChange={(v) => setForm({ ...form, serviceType: v })}
                    options={existingTypes}
                    placeholder="Izaberi tip usluge..."
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Trajanje (min)</Label>
                <Input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, durationMinutes: e.target.value })}
                  placeholder="30"
                />
              </div>
              <div>
                <Label>Cena (RSD)</Label>
                <Input
                  type="number"
                  value={form.priceRsd}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, priceRsd: e.target.value })}
                  placeholder="800"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Otkaži
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Čuvanje..." : "Sačuvaj"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}