"use client";

import { useEffect, useState } from "react";
import { getDashboardBays, createBay, updateBay, deleteBay, type BayItem } from "@/lib/dashboard-api";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";

export function BaysView() {
  const [bays, setBays] = useState<BayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      setBays(await getDashboardBays());
    } catch {
      setError("Greška pri učitavanju boksova.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const bay = await createBay(newName.trim());
      setBays((prev) => [...prev, bay]);
      setNewName("");
    } catch {
      setError("Greška pri kreiranju boksa.");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(bay: BayItem) {
    try {
      const updated = await updateBay(bay.id, { isActive: !bay.isActive });
      setBays((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } catch {
      setError("Greška pri ažuriranju boksa.");
    }
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    try {
      const updated = await updateBay(id, { name: editingName.trim() });
      setBays((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setEditingId(null);
    } catch {
      setError("Greška pri preimenovanju boksa.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBay(id);
      setBays((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setError("Greška pri brisanju boksa.");
    }
  }

  if (loading) return <div className="text-sm text-gray-400">Učitavanje...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Boksovi</h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Naziv</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Akcije</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bays.map((bay) => (
              <tr key={bay.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {editingId === bay.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(bay.id)}
                      className="rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium text-gray-900">{bay.name}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActive(bay)}
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                      bay.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {bay.isActive ? "Aktivan" : "Neaktivan"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {editingId === bay.id ? (
                      <>
                        <button
                          onClick={() => handleRename(bay.id)}
                          className="rounded p-1 text-green-600 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(bay.id); setEditingName(bay.name); }}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(bay.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {/* Red za dodavanje */}
            <tr className="bg-gray-50">
              <td className="px-4 py-3" colSpan={2}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Naziv novog boksa..."
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
                />
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={handleAdd}
                  disabled={adding || !newName.trim()}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {adding ? "Dodavanje..." : "Dodaj"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}