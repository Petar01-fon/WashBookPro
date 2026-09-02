namespace WashBookPro.Api.Common.Formatting;

// .NET has no Intl equivalent, and the sr-Latn-RS culture isn't reliable across
// runtimes/containers for this — same reasoning that led web/lib/date-format.ts's
// own comment to call out genitive-vs-nominative drift on the frontend, except
// there the browser's real Intl still gets it right; here there's no such
// fallback, so a fixed lookup table sidesteps culture/ICU variance entirely.
public static class SerbianDateFormatter
{
    // Nominative forms — these follow a number ("4. septembar"), not genitive
    // ("4. septembra"), per the requested "dan, d. mesec godina." shape.
    private static readonly string[] DayNames =
    {
        "nedelja", "ponedeljak", "utorak", "sreda", "četvrtak", "petak", "subota"
    };

    private static readonly string[] MonthNames =
    {
        "januar", "februar", "mart", "april", "maj", "jun",
        "jul", "avgust", "septembar", "oktobar", "novembar", "decembar"
    };

    // DateTime.DayOfWeek: Sunday=0 .. Saturday=6, matching DayNames' index order.
    public static string FormatLong(DateTime date)
    {
        var dayName = DayNames[(int)date.DayOfWeek];
        var monthName = MonthNames[date.Month - 1];
        return $"{dayName}, {date.Day}. {monthName} {date.Year}.";
    }
}
