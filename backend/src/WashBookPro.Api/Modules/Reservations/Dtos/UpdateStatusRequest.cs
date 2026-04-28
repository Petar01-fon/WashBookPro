namespace WashBookPro.Api.Modules.Reservations;

public partial class ReservationsController
{
    public record UpdateStatusRequest(ReservationStatus Status);

}
