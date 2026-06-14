import "@typespec/http";

using TypeSpec.Http;

model Booking {
  id: string;
  guestName: string;
  guestEmail: string;
  startTime: utcDateTime;
  endTime: utcDateTime;
  createdAt: utcDateTime;
}

model BookingCreate {
  guestName: string;
  guestEmail: string;
  startTime: utcDateTime;
}

model Slot {
  startTime: utcDateTime;
  endTime: utcDateTime;
  available: boolean;
}

model SlotsResponse {
  date: string;
  slots: Slot[];
}

model ErrorResponse {
  error: string;
  message: string;
  details?: string;
}

model ApiCreatedResponse<T> {
  @statusCode statusCode: 201;
  @body body: T;
}

model ApiConflictResponse {
  @statusCode statusCode: 409;
  @body body: ErrorResponse;
}

model ApiNotFoundResponse {
  @statusCode statusCode: 404;
  @body body: ErrorResponse;
}

model ApiValidationErrorResponse {
  @statusCode statusCode: 422;
  @body body: ErrorResponse;
}
