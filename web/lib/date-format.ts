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
