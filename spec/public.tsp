import "@typespec/http";
import "./models.tsp";

using TypeSpec.Http;

@tag("Public: Calendar")
interface PublicCalendar {
  /** Calendar page with available slots */
  @route("/")
  @get
  calendarPage(): void;
}

@tag("Public: Slots")
interface PublicSlots {
  /** Get available slots for a specific date */
  @route("/api/slots")
  @get
  getSlots(
    @query date: string,
  ): SlotsResponse | ApiValidationErrorResponse;
}

@tag("Public: Bookings")
interface PublicBookings {
  /** Create a new booking */
  @route("/bookings")
  @post
  createBooking(
    @body body: BookingCreate,
  ): ApiCreatedResponse<Booking> | ApiConflictResponse | ApiValidationErrorResponse;

  /** Booking confirmation page */
  @route("/bookings/{id}")
  @get
  bookingConfirmation(
    @path id: string,
  ): void | ApiNotFoundResponse;
}
