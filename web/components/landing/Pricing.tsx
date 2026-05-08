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
    <section id="cene" className="bg-[#FAFAF7] py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="font-mono text-xs uppercase tracking-widest text-[#2563EB]">
            Cene
          </p>
          <h2 className="mt-3 text-4xl font-bold text-[#0A0E27] tracking-tight">
            Transparentne cene, bez iznenađenja.
          </h2>
          <p className="mt-4 text-[rgba(10,14,39,0.6)] max-w-lg mx-auto">
            Cene zavise od tipa vozila i odabrane usluge. Svaka perionica može imati sopstvene cene.
          </p>

          {/* Vehicle toggle */}
          <div className="inline-flex mt-8 bg-white border border-[#E8E6E0] rounded-xl p-1 gap-1">
            {vehicles.map((v, i) => (
              <button
                key={v}
                onClick={() => setVehicleIdx(i)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  vehicleIdx === i
                    ? "bg-[#0A0E27] text-white shadow-sm"
                    : "text-[rgba(10,14,39,0.6)] hover:text-[#0A0E27]"
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
                  ? "border-[#2563EB] bg-[#2563EB] text-white ring-4 ring-[#2563EB]/15"
                  : "border-[#E8E6E0] bg-white"
              }`}
            >
              {pkg.featured && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-blue-200 mb-3">
                  Najpopularnije
                </span>
              )}

              <h3
                className={`text-xl font-bold ${
                  pkg.featured ? "text-white" : "text-[#0A0E27]"
                }`}
              >
                {pkg.name}
              </h3>
              <p
                className={`text-sm mt-1 ${
                  pkg.featured ? "text-blue-100" : "text-[rgba(10,14,39,0.6)]"
                }`}
              >
                {pkg.desc}
              </p>

              <div className="mt-7 mb-6">
                <span
                  className={`text-4xl font-extrabold tabular-nums ${
                    pkg.featured ? "text-white" : "text-[#0A0E27]"
                  }`}
                >
                  {pkg.prices[vehicleIdx].toLocaleString("sr-RS")}
                </span>
                <span
                  className={`text-sm ml-1.5 ${
                    pkg.featured ? "text-blue-100" : "text-[rgba(10,14,39,0.5)]"
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
                      pkg.featured ? "text-blue-50" : "text-[rgba(10,14,39,0.7)]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 text-xs font-bold ${
                        pkg.featured ? "text-blue-200" : "text-[#2563EB]"
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
                    ? "bg-white text-[#2563EB] hover:bg-blue-50"
                    : "bg-[#2563EB] text-white hover:bg-blue-700"
                }`}
              >
                {pkg.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-[rgba(10,14,39,0.4)] mt-6">
          Prikazane cene su orijentacione. Finalne cene određuje svaka perionica.
        </p>
      </div>
    </section>
  );
}
