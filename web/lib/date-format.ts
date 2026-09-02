// Same convention already used inline in StatsView, TerminalView, ReservationsView,
// and the booking success page: nominative Serbian month names ("15. jul", not "15. jula").
// Migrating those existing call sites onto this helper is a separate refactor, out of scope here.
export function formatDateSr(date: Date): string {
    return date.toLocaleDateString("sr-Latn-RS", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}
