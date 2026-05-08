import Link from "next/link";

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export function WashList({ tenants }: { tenants: Tenant[] }) {
  return (
    <section id="perionice" className="bg-white py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-12">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--wb-accent)]">
            Perionice
          </p>
          <h2 className="mt-3 text-4xl font-bold text-[var(--wb-fg)] tracking-tight">
            Rezerviši kod nas.
          </h2>
          <p className="mt-3 text-[var(--wb-muted)] max-w-xl">
            Sve perionice na platformi su verifikovane i nude online rezervacije u realnom vremenu.
          </p>
        </div>

        {tenants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--wb-border)] py-20 text-center">
            <div className="w-12 h-12 rounded-xl border border-[var(--wb-border)] bg-[var(--wb-bg)] mx-auto flex items-center justify-center">
              <span className="text-xl">🚿</span>
            </div>
            <p className="mt-4 text-sm text-[var(--wb-fg)]/40">
              Uskoro stižu perionice na platformu.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.map((tenant) => (
              <Link
                key={tenant.id}
                href={`/book/${tenant.slug}`}
                className="group relative rounded-2xl border border-[var(--wb-border)] bg-[var(--wb-bg)] p-6 transition-all duration-200 hover:border-[var(--wb-accent)]/30 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="absolute inset-x-0 top-0 h-0.5 bg-[var(--wb-accent)] rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-[var(--wb-accent)]/15 flex items-center justify-center text-base">
                  🚗
                </div>

                <h3 className="mt-4 font-semibold text-[var(--wb-fg)]">
                  {tenant.name}
                </h3>
                <p className="mt-1 text-sm text-[var(--wb-fg)]/50">
                  Online rezervacija dostupna
                </p>

                <div className="mt-5 flex items-center gap-1 text-sm font-medium text-[var(--wb-accent)]">
                  Rezerviši termin
                  <span className="transition-transform group-hover:translate-x-1 inline-block">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
