using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashBookPro.Api.Common.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPlateNumberToReservation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PlateNumber",
                table: "Reservations",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlateNumber",
                table: "Reservations");
        }
    }
}
