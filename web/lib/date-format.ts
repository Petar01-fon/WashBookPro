// Same convention already used inline in StatsView, TerminalView, ReservationsView,
// and the booking success page: nominative Serbian month names ("15. jul", not "15. jula").
// Migrating those existing call sites onto this helper is a separate refactor, out of scope here.
//
// `weekday`/`timeZone` are opt-in additions (both default to omitted, matching every
// existing call site's behavior exactly) for the booking success page, which needs
// "petak, 4. septembar 2026." in Europe/Belgrade regardless of the viewer's own
// timezone — verified empirically that Intl's sr-Latn-RS weekday output is nominative
// ("petak", not "u petak") and lands in the same order the backend's own Serbian
// email formatter produces, so no reformatting is needed on top of this.
export function formatDateSr(date: Date, options?: { weekday?: boolean; timeZone?: string }): string {
    return date.toLocaleDateString("sr-Latn-RS", {
        weekday: options?.weekday ? "long" : undefined,
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: options?.timeZone,
    });
}

const BELGRADE_TZ = "Europe/Belgrade";

// "09:00" for an ISO instant, in Belgrade regardless of the viewer's zone.
export function formatTimeSr(iso: string): string {
    return new Date(iso).toLocaleTimeString("sr-Latn-RS", { hour: "2-digit", minute: "2-digit", timeZone: BELGRADE_TZ });
}

// YYYY-MM-DD of the Belgrade calendar day containing `instant`.
export function belgradeDateString(instant: Date): string {
    // en-CA formats as YYYY-MM-DD
    return instant.toLocaleDateString("en-CA", { timeZone: BELGRADE_TZ });
}

// Belgrade wall-clock "HH:mm" (24h) of `instant`.
export function belgradeTimeString(instant: Date): string {
    return instant.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: BELGRADE_TZ });
}

const belgradeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: BELGRADE_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
});

// Belgrade's offset from UTC at the instant `ms`, in milliseconds (+1h in winter, +2h in summer).
function belgradeOffsetMs(ms: number): number {
    const parts = belgradeParts.formatToParts(new Date(ms));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const wallClockAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return wallClockAsUtc - ms;
}

// Belgrade wall-clock date + time → UTC ISO string, independent of the browser zone.
export function belgradeWallTimeToUtcIso(date: string, time: string): string {
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    const guess = Date.UTC(y, m - 1, d, hh, mm);
    // Look the offset up again at the candidate instant: a wall time on either side
    // of the DST switch needs the offset that applies to the instant it maps to.
    const firstOffset = belgradeOffsetMs(guess);
    const secondOffset = belgradeOffsetMs(guess - firstOffset);
    return new Date(guess - secondOffset).toISOString();
}
