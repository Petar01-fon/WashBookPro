"use client";

import { useState } from "react";

const vehicles = ["Putnički", "Kombi / SUV", "Teretni"];

const packages = [
  {
    name: "Osnovno",
    desc: "Brzo spoljašnje pranje bez čekanja.",
    prices: [800, 1200, 1800],
    features: ["Spoljašnje pranje", "Sušenje vazduhom", "Čišćenje stakala", "Felne"],
    cta: "Rezerviši",
    featured: false,
  },
  {
    name: "Kompletno",
    desc: "Unutrašnjost i spoljašnjost, kao novo.",
    prices: [1500, 2200, 3200],
    features: [
      "Sve iz Osnovnog",
      "Usisavanje enterijera",
      "Brisanje površina",
      "Mirisna pločica",
      "Zaštitni vosak",
    ],
    cta: "Rezerviši",
    featured: true,
  },
  {
    name: "Premium",
    desc: "Detajling za zahtevne vlasnike.",
    prices: [2500, 3800, 5500],
    features: [
      "Sve iz Kompletnog",
      "Ručna polirka karoserije",
      "Zaštitni keramički premaz",
      "Ozonizacija enterijera",
      "Prioritetni termin",
    ],
    cta: "Rezerviši",
    featured: false,
  },
];

export function Pricing() {
  const [vehicleIdx, setVehicleIdx] = useState(0);

  return (
    <section id="cene" className="bg-[var(--wb-bg)] py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--wb-accent)]">
            Cene
          </p>
          <h2 className="mt-3 text-4xl font-bold text-[var(--wb-fg)] tracking-tight">
            Transparentne cene, bez iznenađenja.
          </h2>
          <p className="mt-4 text-[var(--wb-muted)] max-w-lg mx-auto">
            Cene zavise od tipa vozila i odabrane usluge. Svaka perionica može imati sopstvene cene.
          </p>

          {/* Vehicle toggle */}
          <div className="inline-flex mt-8 bg-white border border-[var(--wb-border)] rounded-xl p-1 gap-1">
            {vehicles.map((v, i) => (
              <button
                key={v}
                onClick={() => setVehicleIdx(i)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  vehicleIdx === i
                    ? "bg-[var(--wb-fg)] text-white shadow-sm"
                    : "text-[var(--wb-muted)] hover:text-[var(--wb-fg)]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className={`rounded-2xl p-7 border flex flex-col ${
                pkg.featured
                  ? "border-[var(--wb-accent)] bg-[var(--wb-accent)] text-white ring-4 ring-[var(--wb-accent)]/15"
                  : "border-[var(--wb-border)] bg-white"
              }`}
            >
              {pkg.featured && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-blue-200 mb-3">
                  Najpopularnije
                </span>
              )}

              <h3
                className={`text-xl font-bold ${
                  pkg.featured ? "text-white" : "text-[var(--wb-fg)]"
                }`}
              >
                {pkg.name}
              </h3>
              <p
                className={`text-sm mt-1 ${
                  pkg.featured ? "text-blue-100" : "text-[var(--wb-muted)]"
                }`}
              >
                {pkg.desc}
              </p>

              <div className="mt-7 mb-6">
                <span
                  className={`text-4xl font-extrabold tabular-nums ${
                    pkg.featured ? "text-white" : "text-[var(--wb-fg)]"
                  }`}
                >
                  {pkg.prices[vehicleIdx].toLocaleString("sr-RS")}
                </span>
                <span
                  className={`text-sm ml-1.5 ${
                    pkg.featured ? "text-blue-100" : "text-[var(--wb-fg)]/50"
                  }`}
                >
                  RSD
                </span>
              </div>

              <ul className="space-y-2.5 flex-1">
                {pkg.features.map((f) => (
                  <li
                    key={f}
                    className={`flex items-start gap-2.5 text-sm ${
                      pkg.featured ? "text-blue-50" : "text-[var(--wb-fg)]/70"
                    }`}
                  >
                    <span
                      className={`mt-0.5 text-xs font-bold ${
                        pkg.featured ? "text-blue-200" : "text-[var(--wb-accent)]"
                      }`}
                    >
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#perionice"
                className={`mt-7 block text-center py-3 rounded-xl text-sm font-semibold transition-colors ${
                  pkg.featured
                    ? "bg-white text-[var(--wb-accent)] hover:bg-blue-50"
                    : "bg-[var(--wb-accent)] text-white hover:bg-blue-700"
                }`}
              >
                {pkg.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-[var(--wb-fg)]/40 mt-6">
          Prikazane cene su orijentacione. Finalne cene određuje svaka perionica.
        </p>
      </div>
    </section>
  );
}
