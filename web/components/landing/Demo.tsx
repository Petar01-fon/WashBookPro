export function Demo() {
  return (
    <section className="bg-[#FAFAF7] py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — text */}
          <div className="space-y-6">
            <p className="font-mono text-xs uppercase tracking-widest text-[#2563EB]">
              Booking flow
            </p>
            <h2 className="text-4xl font-bold text-[#0A0E27] tracking-tight leading-tight">
              Od izbora usluge<br />do potvrde za 4 klika.
            </h2>
            <div className="space-y-5 pt-2">
              {[
                {
                  n: "1",
                  t: "Odaberi perionce",
                  d: "Pregled svih aktivnih perionica sa lokacijom i dostupnim terminima.",
                },
                {
                  n: "2",
                  t: "Izaberi uslugu",
                  d: "Osnovno, kompletno ili premium pranje — sa jasnim cenama i trajanjem.",
                },
                {
                  n: "3",
                  t: "Slobodni termini",
                  d: "Kalendar sa dostupnim bokovima u realnom vremenu. Zauzeti su jasno označeni.",
                },
                {
                  n: "4",
                  t: "Potvrdi i dođi",
                  d: "Unesite podatke i potvrdite. Email potvrda stiže za sekund.",
                },
              ].map((step) => (
                <div key={step.n} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                    {step.n}
                  </div>
                  <div>
                    <p className="font-semibold text-[#0A0E27]">{step.t}</p>
                    <p className="text-sm text-[rgba(10,14,39,0.6)] mt-0.5 leading-relaxed">
                      {step.d}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mockup */}
          <div className="bg-white rounded-2xl border border-[#E8E6E0] p-6 shadow-sm space-y-4">
            {/* Progress bar */}
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`flex-1 h-1 rounded-full ${
                    i <= 3 ? "bg-[#2563EB]" : "bg-[#E8E6E0]"
                  }`}
                />
              ))}
            </div>

            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[rgba(10,14,39,0.4)]">
                Korak 3 od 4 · Slobodni termini
              </p>
              <h4 className="text-sm font-semibold text-[#0A0E27] mt-1">
                Sreda, 7. maj 2026.
              </h4>
            </div>

            {/* Time slots grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { t: "09:00", state: "free" },
                { t: "09:30", state: "free" },
                { t: "10:00", state: "selected" },
                { t: "10:30", state: "free" },
                { t: "11:00", state: "taken" },
                { t: "11:30", state: "free" },
              ].map(({ t, state }) => (
                <div
                  key={t}
                  className={`text-center text-xs py-2.5 rounded-xl font-medium border transition-colors ${
                    state === "selected"
                      ? "bg-[#2563EB] text-white border-[#2563EB]"
                      : state === "taken"
                      ? "bg-[#F5F5F3] text-[rgba(10,14,39,0.25)] border-[#E8E6E0] line-through"
                      : "text-[#0A0E27] border-[#E8E6E0]"
                  }`}
                >
                  {t}
                </div>
              ))}
            </div>

            <div className="border-t border-[#E8E6E0] pt-4 flex items-center justify-between text-xs">
              <span className="text-[rgba(10,14,39,0.6)]">
                Kompletno pranje · 60 min
              </span>
              <span className="font-semibold text-[#0A0E27]">1.500 RSD</span>
            </div>

            <button className="w-full bg-[#2563EB] text-white text-xs font-semibold py-2.5 rounded-xl">
              Potvrdi termin
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
