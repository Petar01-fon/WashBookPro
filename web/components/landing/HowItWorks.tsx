const steps = [
  {
    num: "01",
    title: "Pronađi perionce",
    desc: "Pregledaj listu perionica u svom gradu sa cenama i dostupnim terminima u realnom vremenu.",
  },
  {
    num: "02",
    title: "Izaberi termin",
    desc: "Odaberi datum, uslugu i slobodan boks. Instant potvrda bez čekanja i pozivanja.",
  },
  {
    num: "03",
    title: "Dođi i peri",
    desc: "Email potvrda stiže za sekund. Dođi u odabrano vreme — boks te čeka, nema reda.",
  },
];

export function HowItWorks() {
  return (
    <section id="kako-radi" className="bg-white py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-16">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--wb-accent)]">
            Kako radi
          </p>
          <h2 className="mt-3 text-4xl font-bold text-[var(--wb-fg)] tracking-tight">
            Tri koraka do čistog auta.
          </h2>
        </div>

        <div className="relative grid md:grid-cols-3 gap-10">
          {/* Connecting line */}
          <div
            className="hidden md:block absolute top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-[var(--wb-border)]"
            aria-hidden
          />

          {steps.map((s) => (
            <div key={s.num} className="space-y-5">
              <div className="relative w-16 h-16 rounded-xl border border-[var(--wb-border)] bg-[var(--wb-bg)] flex items-center justify-center">
                <span className="font-mono text-2xl font-bold text-[var(--wb-fg)]">
                  {s.num}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--wb-fg)]">{s.title}</h3>
                <p className="mt-2 text-[var(--wb-muted)] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
