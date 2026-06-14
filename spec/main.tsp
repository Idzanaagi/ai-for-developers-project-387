import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";
import "./models.tsp";
import "./admin.tsp";
import "./public.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@server("http://localhost:3000", "Development server")
@service(#{ title: "Calendar Booking API" })
@info(#{ version: "1.0.0" })
namespace CalendarBooking;
