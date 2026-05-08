using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashBookPro.Api.Common.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ConvertReservationCreatedByToEnum : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CreatedByInt",
                table: "Reservations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(@"
                UPDATE ""Reservations""
                SET ""CreatedByInt"" = CASE
                    WHEN ""CreatedBy"" = 'Worker' THEN 1
                    ELSE 0
                END
            ");

            migrationBuilder.DropColumn(name: "CreatedBy", table: "Reservations");

            migrationBuilder.RenameColumn(
                name: "CreatedByInt",
                table: "Reservations",
                newName: "CreatedBy");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatedByText",
                table: "Reservations",
                type: "text",
                nullable: false,
                defaultValue: "Customer");

            migrationBuilder.Sql(@"
                UPDATE ""Reservations""
                SET ""CreatedByText"" = CASE
                    WHEN ""CreatedBy"" = 1 THEN 'Worker'
                    ELSE 'Customer'
                END
            ");

            migrationBuilder.DropColumn(name: "CreatedBy", table: "Reservations");

            migrationBuilder.RenameColumn(
                name: "CreatedByText",
                table: "Reservations",
                newName: "CreatedBy");
        }
    }
}
