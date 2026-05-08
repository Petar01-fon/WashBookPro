import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[var(--wb-bg)] border-t border-[var(--wb-border)] py-14">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <p className="font-bold text-[var(--wb-fg)] text-lg tracking-tight">WashBook</p>
            <p className="text-sm text-[var(--wb-fg)]/55 mt-3 leading-relaxed max-w-[220px]">
              Online rezervacija pranja auta u Srbiji. Brzo, jednostavno, bez telefona.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--wb-fg)]/35 mb-4">
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
                    className="text-sm text-[var(--wb-muted)] hover:text-[var(--wb-fg)] transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--wb-fg)]/35 mb-4">
              Kontakt
            </p>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:info@washbook.rs"
                  className="text-sm text-[var(--wb-muted)] hover:text-[var(--wb-fg)] transition-colors"
                >
                  info@washbook.rs
                </a>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-[var(--wb-muted)] hover:text-[var(--wb-fg)] transition-colors"
                >
                  Za perionice →
                </Link>
              </li>
              <li>
                <Link
                  href="/login/customer"
                  className="text-sm text-[var(--wb-muted)] hover:text-[var(--wb-fg)] transition-colors"
                >
                  Prijava
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-sm text-[var(--wb-muted)] hover:text-[var(--wb-fg)] transition-colors"
                >
                  Registracija
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--wb-border)] mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--wb-fg)]/35">
            © 2026 WashBook. Sva prava zadržana.
          </p>
          <div className="flex gap-5">
            <a
              href="#"
              className="text-xs text-[var(--wb-fg)]/35 hover:text-[var(--wb-fg)] transition-colors"
            >
              Politika privatnosti
            </a>
            <a
              href="#"
              className="text-xs text-[var(--wb-fg)]/35 hover:text-[var(--wb-fg)] transition-colors"
            >
              Uslovi korišćenja
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
