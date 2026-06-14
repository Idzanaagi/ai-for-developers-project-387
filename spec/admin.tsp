import "@typespec/http";
import "./models.tsp";

using TypeSpec.Http;

@tag("Admin: Bookings")
interface AdminBookings {
  /** List all upcoming bookings */
  @route("/admin")
  @get
  listBookings(): void;
}
