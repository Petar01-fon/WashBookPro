"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  isCustomerLoggedIn,
  getCustomerInfoFromToken,
  customerLogout,
  CustomerTokenInfo,
} from "@/lib/customer-auth";

function Avatar({ info, onLogout }: { info: CustomerTokenInfo; onLogout: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleLogout() {
    customerLogout();
    setOpen(false);
    onLogout();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Moj profil"
        aria-expanded={open}
        className={`w-9 h-9 sm:w-9 sm:h-9 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0 transition-all
          hover:ring-2 hover:ring-[#2563EB]/30 hover:ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50`}
      >
        <span className="text-white text-sm font-semibold leading-none select-none">
          {info.initials || "?"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E8E6E0] rounded-md shadow-md overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#E8E6E0]">
            <p className="text-sm font-semibold text-[#0A0E27]">
              {info.firstName} {info.lastName}
            </p>
            <p className="text-xs text-[rgba(10,14,39,0.5)] mt-0.5 truncate">
              {info.email}
            </p>
          </div>

          <div className="py-1">
            <Link
              href="/profil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#0A0E27] hover:bg-[#FAFAF7] transition-colors"
            >
              <svg className="w-4 h-4 text-[rgba(10,14,39,0.4)] shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="5.5" r="2.5" />
                <path d="M2 13c0-3.314 2.686-5 6-5s6 1.686 6 5" strokeLinecap="round" />
              </svg>
              Moj profil
            </Link>
            <Link
              href="/rezervacije"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#0A0E27] hover:bg-[#FAFAF7] transition-colors"
            >
              <svg className="w-4 h-4 text-[rgba(10,14,39,0.4)] shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="3" width="12" height="11" rx="1.5" />
                <path d="M5 2v2M11 2v2M2 7h12" strokeLinecap="round" />
              </svg>
              Moje rezervacije
            </Link>
          </div>

          <div className="border-t border-[#E8E6E0] py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#EF4444] hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" strokeLinecap="round" />
                <path d="M11 11l3-3-3-3M14 8H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Odjavi se
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerTokenInfo | null>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (isCustomerLoggedIn()) {
      setCustomerInfo(getCustomerInfoFromToken());
    }
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== "washbook_customer_token") return;
      if (e.newValue === null) {
        setCustomerInfo(null);
      } else {
        setCustomerInfo(getCustomerInfoFromToken());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#FAFAF7]/95 backdrop-blur-md border-b border-[#E8E6E0]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight text-[#0A0E27]">
          WashBook
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#kako-radi" className="text-sm text-[rgba(10,14,39,0.6)] hover:text-[#0A0E27] transition-colors">Kako radi</a>
          <a href="#perionice" className="text-sm text-[rgba(10,14,39,0.6)] hover:text-[#0A0E27] transition-colors">Perionice</a>
          <a href="#cene" className="text-sm text-[rgba(10,14,39,0.6)] hover:text-[#0A0E27] transition-colors">Cene</a>
          <a href="#faq" className="text-sm text-[rgba(10,14,39,0.6)] hover:text-[#0A0E27] transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-4">
          {customerInfo ? (
            <>
              <Link
                href="/rezervacije"
                className="hidden sm:block text-sm text-[rgba(10,14,39,0.6)] hover:text-[#0A0E27] transition-colors"
              >
                Moje rezervacije
              </Link>
              <Avatar info={customerInfo} onLogout={() => setCustomerInfo(null)} />
            </>
          ) : (
            <>
              <Link href="/login/customer" className="text-sm text-[rgba(10,14,39,0.6)] hover:text-[#0A0E27] transition-colors">
                Prijava
              </Link>
              <Link href="/register" className="text-sm bg-[#2563EB] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Rezerviši
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
