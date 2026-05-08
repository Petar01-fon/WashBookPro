import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#FAFAF7] border-t border-[#E8E6E0] py-14">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <p className="font-bold text-[#0A0E27] text-lg tracking-tight">WashBook</p>
            <p className="text-sm text-[rgba(10,14,39,0.55)] mt-3 leading-relaxed max-w-[220px]">
              Online rezervacija pranja auta u Srbiji. Brzo, jednostavno, bez telefona.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[rgba(10,14,39,0.35)] mb-4">
              Navigacija
            </p>
            <ul className="space-y-3">
              {[
                { label: "Perionice", href: "#perionice" },
                { label: "Kako radi", href: "#kako-radi" },
                { label: "Cene", href: "#cene" },
                { label: "FAQ", href: "#faq" },
              ].map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-[rgba(10,14,39,0.6)] hover:text-[#0A0E27] transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[rgba(10,14,39,0.35)] mb-4">
              Kontakt
            </p>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:info@washbook.rs"
                  className="text-sm text-[rgba(10,14,39,0.6)] hover:text-[#0A0E27] transition-colors"
                >
                  info@washbook.rs
                </a>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-[rgba(10,14,39,0.6)] hover:text-[#0A0E27] transition-colors"
                >
                  Za perionice →
                </Link>
              </li>
              <li>
                <Link
                  href="/login/customer"
                  className="text-sm text-[rgba(10,14,39,0.6)] hover:text-[#0A0E27] transition-colors"
                >
                  Prijava
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-sm text-[rgba(10,14,39,0.6)] hover:text-[#0A0E27] transition-colors"
                >
                  Registracija
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#E8E6E0] mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[rgba(10,14,39,0.35)]">
            © 2026 WashBook. Sva prava zadržana.
          </p>
          <div className="flex gap-5">
            <a
              href="#"
              className="text-xs text-[rgba(10,14,39,0.35)] hover:text-[#0A0E27] transition-colors"
            >
              Politika privatnosti
            </a>
            <a
              href="#"
              className="text-xs text-[rgba(10,14,39,0.35)] hover:text-[#0A0E27] transition-colors"
            >
              Uslovi korišćenja
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
