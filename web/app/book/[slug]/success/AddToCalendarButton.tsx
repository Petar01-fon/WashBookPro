"use client";

interface Props {
    serviceName: string;
    tenantName: string;
    startsAt: string;
    endsAt: string;
    address?: string | null;
    plateNumber?: string | null;
}

// RFC5545 UTC form: "20260904T060000Z" — strip the ISO string's dashes/colons and
// the millisecond fraction, keep the Z. Re-parsed through Date rather than string-
// sliced directly so a non-UTC-suffixed input (shouldn't happen here, but cheap to
// guard) still normalizes to a genuine UTC instant instead of silently mislabeling it.
function toIcsUtc(iso: string): string {
    return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// RFC5545 TEXT escaping — the only characters our own values could plausibly
// contain (service/tenant names, address) that are structurally significant.
function escapeIcsText(value: string): string {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");
}

function buildIcs(props: Props): string {
    const uid = `${crypto.randomUUID()}@washbookpro.rs`;
    const dtstamp = toIcsUtc(new Date().toISOString());

    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//WashBookPro//Booking//SR",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${toIcsUtc(props.startsAt)}`,
        `DTEND:${toIcsUtc(props.endsAt)}`,
        `SUMMARY:${escapeIcsText(`${props.serviceName} — ${props.tenantName}`)}`,
    ];

    if (props.address) lines.push(`LOCATION:${escapeIcsText(props.address)}`);
    if (props.plateNumber) lines.push(`DESCRIPTION:${escapeIcsText(`Tablica: ${props.plateNumber}`)}`);

    lines.push("END:VEVENT", "END:VCALENDAR");

    // CRLF is a hard requirement of the format, not a style choice — some calendar
    // clients reject or mis-parse LF-only .ics files.
    return lines.join("\r\n");
}

export default function AddToCalendarButton(props: Props) {
    const handleClick = () => {
        const ics = buildIcs(props);
        const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "rezervacija.ics";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <button
            onClick={handleClick}
            className="block w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-center border border-[var(--wb-border)] text-[var(--wb-fg)] hover:border-[var(--wb-fg)]/30 transition-colors"
        >
            Dodaj u kalendar
        </button>
    );
}
