import Link from "next/link";
import { getTenantBySlug, type TenantInfo } from "@/lib/booking-api";
import { formatDateSr } from "@/lib/date-format";
import AddToCalendarButton from "./AddToCalendarButton";

interface Props {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{
        name?: string;
        service?: string;
        startsAt?: string;
        endsAt?: string;
        price?: string;
        plate?: string;
    }>;
}

// Deliberately separate from ConfirmationStep/DateTimeStep's own formatTime — those
// format in the *viewer's* local zone (out of scope here, a separate fix), while this
// page must always show Belgrade time regardless of where the customer is reading
// the confirmation from (e.g. diaspora checking a booking made for family at home).
function formatTimeBelgrade(iso: string): string {
    return new Date(iso).toLocaleTimeString("sr-Latn-RS", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Belgrade",
    });
}

export default async function SuccessPage({ params, searchParams }: Props) {
    const { slug } = await params;
    const { name, service, startsAt, endsAt, price, plate } = await searchParams;

    // Without these two, there's nothing real to show — rather than render a
    // "successful" booking with blank fields (the previous behavior), tell the
    // visitor plainly that there's nothing here and point them back at booking.
    if (!startsAt || !service) {
        return (
            <div className="min-h-screen bg-[var(--wb-bg)] flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl border border-[var(--wb-border)] p-6 text-center space-y-4">
                    <p className="text-sm text-[var(--wb-fg)]">Podaci o rezervaciji nisu dostupni.</p>
                    <Link
                        href={`/book/${slug}`}
                        className="inline-block py-2.5 px-4 rounded-lg text-sm font-semibold border border-[var(--wb-border)] text-[var(--wb-fg)] hover:border-[var(--wb-fg)]/30 transition-colors"
                    >
                        Nazad na rezervaciju
                    </Link>
                </div>
            </div>
        );
    }

    // Server-fetched, not threaded through the URL — authoritative (the tenant's
    // current name/address/phone, not whatever was true at booking time) and keeps
    // the query string free of anything beyond what this specific booking needs.
    // A failed fetch must not take the whole page down with it — the booking itself
    // already succeeded by the time the customer is here, so the header/footer
    // (cosmetic, tenant-branding only) are just omitted rather than thrown.
    let tenant: TenantInfo | null = null;
    try {
        tenant = await getTenantBySlug(slug);
    } catch {
        tenant = null;
    }

    const dateText = formatDateSr(new Date(startsAt), { weekday: true, timeZone: "Europe/Belgrade" });
    const timeText = formatTimeBelgrade(startsAt);
    const priceText = price ? Number(price).toLocaleString("sr-Latn-RS") : null;

    return (
        <div className="min-h-screen bg-[var(--wb-bg)] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--wb-border)] overflow-hidden">
                {tenant && (
                    <div className="bg-[var(--wb-accent)] px-6 py-5">
                        <span className="text-lg font-bold text-[var(--wb-on-accent)]">{tenant.name}</span>
                    </div>
                )}

                <div className="p-6 space-y-6">
                    <div className="space-y-1">
                        <p className="text-[var(--wb-fg)]">Pozdrav, {name}!</p>
                        {/* Must match the confirmation email verbatim — same system,
                            same promise, no mention of a second "now confirmed" email
                            since none exists. */}
                        <p className="text-[var(--wb-fg)]">Vaša rezervacija je primljena. Termin je rezervisan za vas.</p>
                    </div>

                    <div className="rounded-xl border border-[var(--wb-border)] py-4 text-center space-y-1">
                        <div className="text-sm text-[var(--wb-fg)]">{dateText}</div>
                        <div className="text-3xl font-bold text-[var(--wb-fg)]">{timeText}</div>
                    </div>

                    {/* No bay/box shown here on purpose — it means nothing to the
                        customer and sets an expectation (a specific physical bay)
                        the wash doesn't have to honor if a car gets moved. */}
                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                            <dt className="text-[var(--wb-muted)]">Usluga</dt>
                            <dd className="font-medium text-[var(--wb-fg)] text-right">{service}</dd>
                        </div>
                        {priceText && (
                            <div className="flex justify-between gap-4">
                                <dt className="text-[var(--wb-muted)]">Cena</dt>
                                <dd className="font-medium text-[var(--wb-fg)] text-right">{priceText} RSD</dd>
                            </div>
                        )}
                        {plate && (
                            <div className="flex justify-between gap-4">
                                <dt className="text-[var(--wb-muted)]">Tablica</dt>
                                <dd className="font-medium text-[var(--wb-fg)] text-right">{plate}</dd>
                            </div>
                        )}
                    </dl>

                    <p className="text-sm text-[var(--wb-muted)]">
                        Potvrda je poslata na vašu email adresu.
                    </p>

                    <div className="space-y-2">
                        <AddToCalendarButton
                            serviceName={service}
                            tenantName={tenant?.name ?? "WashBookPro"}
                            startsAt={startsAt}
                            endsAt={endsAt ?? startsAt}
                            address={tenant?.address}
                            plateNumber={plate ?? null}
                        />
                        <Link
                            href={`/book/${slug}`}
                            className="block w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-center bg-[var(--wb-accent)] text-[var(--wb-on-accent)]"
                        >
                            Nova rezervacija
                        </Link>
                    </div>
                </div>

                {tenant && (tenant.address || tenant.phone) && (
                    <div className="border-t border-[var(--wb-border)] px-6 py-4 text-xs text-[var(--wb-muted)] space-y-0.5">
                        {tenant.address && <div>{tenant.address}</div>}
                        {tenant.phone && <div>{tenant.phone}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}
