"use client";

import { useEffect, useState } from "react";
import { getAccessToken, decodeToken } from "@/lib/auth";

type DashboardData = {
  userId: string;
  tenantId: string;
  role: string;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const payload = decodeToken(token);
    if (!payload) return;
    setData({ userId: payload.sub, tenantId: payload.tenant_id, role: payload.role });
  }, []);

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Dobrodošli u WashBookPro</p>
      </div>

      <div className="rounded-xl border border-green-200 bg-green-50 p-6">
        <h2 className="mb-4 text-sm font-medium text-green-800">
          ✓ Autentikacija uspešna — Faza 0.6 scaffold
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-3">
            <dt className="w-24 text-gray-500">User ID</dt>
            <dd className="font-mono text-gray-900">{data.userId}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 text-gray-500">Tenant ID</dt>
            <dd className="font-mono text-gray-900">{data.tenantId}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 text-gray-500">Rola</dt>
            <dd className="font-mono text-gray-900">{data.role}</dd>
          </div>
        </dl>
      </div>

      <p className="text-sm text-gray-400">
        Sadržaj dashboarda dolazi u Fazi 1.
      </p>
    </div>
  );
}