"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAccessToken, getRole, getTenantSlug, logout } from "@/lib/auth";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  WashingMachine,
} from "lucide-react";

const navItems = [
  {
    label: "Rezervacije",
    href: "/dashboard/reservations",
    icon: CalendarDays,
  },
  {
    label: "Boksovi",
    href: "/dashboard/bays",
    icon: WashingMachine,
  },
  {
    label: "Statistike",
    href: "/dashboard/stats",
    icon: LayoutDashboard,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  useEffect(() => {
    const role = getRole();
    if (role !== "Owner") {
      router.replace("/login");
      return;
    }
    setTenantSlug(getTenantSlug());
  }, [router]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
      {/* Logo / naziv */}
      <div className="border-b border-gray-200 px-4 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Car Wash
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-gray-800">
          {tenantSlug ?? "—"}
        </p>
      </div>

      {/* Navigacija */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-200 px-2 py-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Odjavi se
        </button>
      </div>
    </aside>
  );
}