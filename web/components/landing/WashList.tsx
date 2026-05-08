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
          <p className="font-mono text-xs uppercase tracking-widest text-[#2563EB]">
            Perionice
          </p>
          <h2 className="mt-3 text-4xl font-bold text-[#0A0E27] tracking-tight">
            Rezerviši kod nas.
          </h2>
          <p className="mt-3 text-[rgba(10,14,39,0.6)] max-w-xl">
            Sve perionice na platformi su verifikovane i nude online rezervacije u realnom vremenu.
          </p>
        </div>

        {tenants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E8E6E0] py-20 text-center">
            <div className="w-12 h-12 rounded-xl border border-[#E8E6E0] bg-[#FAFAF7] mx-auto flex items-center justify-center">
              <span className="text-xl">🚿</span>
            </div>
            <p className="mt-4 text-sm text-[rgba(10,14,39,0.4)]">
              Uskoro stižu perionice na platformu.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.map((tenant) => (
              <Link
                key={tenant.id}
                href={`/book/${tenant.slug}`}
                className="group relative rounded-2xl border border-[#E8E6E0] bg-[#FAFAF7] p-6 transition-all duration-200 hover:border-[#2563EB]/30 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="absolute inset-x-0 top-0 h-0.5 bg-[#2563EB] rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-[#2563EB]/15 flex items-center justify-center text-base">
                  🚗
                </div>

                <h3 className="mt-4 font-semibold text-[#0A0E27]">
                  {tenant.name}
                </h3>
                <p className="mt-1 text-sm text-[rgba(10,14,39,0.5)]">
                  Online rezervacija dostupna
                </p>

                <div className="mt-5 flex items-center gap-1 text-sm font-medium text-[#2563EB]">
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
