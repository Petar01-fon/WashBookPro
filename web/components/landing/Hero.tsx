"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function Counter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(current);
      if (current >= target) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [target]);

  return <span>{count}</span>;
}

function BrowserMockup() {
  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--wb-border)] shadow-2xl bg-white">
      {/* Chrome bar */}
      <div className="bg-[#F5F5F3] border-b border-[var(--wb-border)] px-4 py-3 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 bg-white rounded-md border border-[var(--wb-border)] px-3 py-1 text-xs text-[var(--wb-fg)]/35 text-center font-mono">
          washbook.app/book/dev-wash
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--wb-accent)]">
            Korak 1 / 3
          </span>
          <span className="text-[10px] text-[var(--wb-fg)]/35">Dev Wash · Beograd</span>
        </div>

        <h3 className="text-sm font-semibold text-[var(--wb-fg)]">Odaberite uslugu</h3>

        <div className="space-y-2">
          {[
            { name: "Osnovno pranje", dur: "30 min", price: "800 RSD", sel: false },
            { name: "Kompletno pranje", dur: "60 min", price: "1.500 RSD", sel: true },
            { name: "Premium detajling", dur: "90 min", price: "2.500 RSD", sel: false },
          ].map((s) => (
            <div
              key={s.name}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs ${
                s.sel
                  ? "border-[var(--wb-accent)] bg-blue-50"
                  : "border-[var(--wb-border)] bg-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    s.sel ? "border-[var(--wb-accent)]" : "border-[var(--wb-border)]"
                  }`}
                >
                  {s.sel && (
                    <div className="w-2 h-2 rounded-full bg-[var(--wb-accent)]" />
                  )}
                </div>
                <span className="font-medium text-[var(--wb-fg)]">{s.name}</span>
                <span className="text-[var(--wb-fg)]/40">· {s.dur}</span>
              </div>
              <span className="font-semibold text-[var(--wb-fg)]">{s.price}</span>
            </div>
          ))}
        </div>

        <button className="w-full bg-[var(--wb-accent)] text-white text-xs font-semibold py-2.5 rounded-xl">
          Dalje →
        </button>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="bg-[var(--wb-bg)] pt-32 pb-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--wb-accent)] border border-[var(--wb-accent)]/25 bg-blue-50 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--wb-accent)] animate-pulse" />
              Platforma za autoperionce
            </span>

            <h1 className="text-5xl lg:text-[3.5rem] font-extrabold text-[var(--wb-fg)] leading-[1.06] tracking-tight">
              Rezervišite<br />
              pranje za<br />
              <span className="text-[var(--wb-accent)]">60 sekundi.</span>
            </h1>

            <p className="text-lg text-[var(--wb-muted)] leading-relaxed max-w-[420px]">
              Pronađite perionce u svom gradu, izaberite slobodan termin i
              potvrdite rezervaciju — bez telefona, bez čekanja.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#perionice"
                className="inline-flex items-center justify-center gap-2 bg-[var(--wb-accent)] text-white px-6 py-3.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
              >
                Pronađi perionicu
                <span aria-hidden>→</span>
              </a>
              <a
                href="#kako-radi"
                className="inline-flex items-center justify-center gap-2 text-[var(--wb-fg)] border border-[var(--wb-border)] bg-white px-6 py-3.5 rounded-xl font-semibold text-sm hover:border-[var(--wb-fg)]/30 transition-colors"
              >
                Kako radi
              </a>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 pt-2">
              <div>
                <p className="text-3xl font-extrabold text-[var(--wb-fg)] tabular-nums">
                  <Counter target={27} />+
                </p>
                <p className="text-xs text-[var(--wb-fg)]/50 mt-1 font-mono uppercase tracking-wide">
                  perionica
                </p>
              </div>
              <div className="w-px h-10 bg-[var(--wb-border)]" />
              <div>
                <p className="text-3xl font-extrabold text-[var(--wb-fg)] tabular-nums">
                  <Counter target={1200} />+
                </p>
                <p className="text-xs text-[var(--wb-fg)]/50 mt-1 font-mono uppercase tracking-wide">
                  rezervacija
                </p>
              </div>
              <div className="w-px h-10 bg-[var(--wb-border)]" />
              <div>
                <p className="text-3xl font-extrabold text-[var(--wb-fg)] tabular-nums">
                  <Counter target={98} />%
                </p>
                <p className="text-xs text-[var(--wb-fg)]/50 mt-1 font-mono uppercase tracking-wide">
                  zadovoljnih
                </p>
              </div>
            </div>
          </div>

          {/* Right — browser mockup */}
          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-br from-blue-100/60 via-transparent to-transparent rounded-3xl" />
            <div className="relative">
              <BrowserMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
