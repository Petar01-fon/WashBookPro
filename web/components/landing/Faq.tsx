"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Da li moram da se registrujem?",
    a: "Ne — možete rezervisati kao gost samo sa imenom, telefonom i emailom. Registracija je opciona i donosi brže buduće rezervacije.",
  },
  {
    q: "Mogu li da otkažem rezervaciju?",
    a: "Da, rezervaciju možete otkazati ili promeniti najkasnije sat vremena pre termina direktno iz profila ili email linka koji ste dobili.",
  },
  {
    q: "Kako znam da je termin stvarno slobodan?",
    a: "Dostupnost termina se prikazuje u realnom vremenu direktno iz sistema perionce. Termin koji vidite kao slobodan zaista jeste slobodan.",
  },
  {
    q: "Prihvata li perionica kartice?",
    a: "Plaćanje se vrši na licu mesta u perionici. Svaka perionica sama određuje metode plaćanja — keš, kartica ili POS terminal.",
  },
  {
    q: "Šta ako se zakasnim na termin?",
    a: "Preporučujemo da kontaktirate perionce. Većina drži termin 10–15 minuta, ali to zavisi od pravila konkretne perionce.",
  },
  {
    q: "Da li je dostupna mobilna aplikacija?",
    a: "Mobilna aplikacija je u izradi i uskoro stiže. Trenutna web verzija je u potpunosti optimizovana za mobilne uređaje.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-white py-24">
      <div className="max-w-3xl mx-auto px-6">
        <div className="mb-12">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--wb-accent)]">
            FAQ
          </p>
          <h2 className="mt-3 text-4xl font-bold text-[var(--wb-fg)] tracking-tight">
            Često postavljana pitanja.
          </h2>
        </div>

        <div className="divide-y divide-[var(--wb-border)]">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between py-5 text-left gap-4"
              >
                <span className="font-medium text-[var(--wb-fg)]">{faq.q}</span>
                <span
                  className={`text-[var(--wb-accent)] text-xl font-light shrink-0 transition-transform duration-200 ${
                    open === i ? "rotate-45" : "rotate-0"
                  }`}
                >
                  +
                </span>
              </button>
              {open === i && (
                <p className="text-sm text-[var(--wb-muted)] leading-relaxed pb-5">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
