## Exploration: Error Handling System — Global Exception Filter + Error Hierarchy

### Current State

The project has a **custom error hierarchy** built on `ErrorBase` (in `src/common/errors/error-base/`) with three domain groups:
- `Common` (`COM`) — `GenericError` 
- `App` (`UA`) — `AppError`, `AppVersionNotFoundError`
- `Entity` (`ETY`) — `EntityError`, `EntityNotFoundError`, `EntityNameAlreadyExistsError`, `EntityEmailAlreadyExistsError`, `EntityPopulateError`

Each error produces a code like `UA-ETY-001` via `errorGroup + code` and exposes a public payload via `getErrorPublic(): { message, code }`.

**However, there is ZERO global exception filtering:**
- No `ExceptionFilter` implementation anywhere in the codebase
- No `APP_FILTER` provider registered in any module
- No `@UseFilters()` decorators
- `main.ts` does not call `app.useGlobalFilters()`
- No centralized error response envelope

**Current error handling pattern (repeated in every controller method):**
```
try {
  // business logic
} catch (error) {
  if (error instanceof SpecificError) {
    throw new BadRequestException(error.getErrorPublic());
  }
  this.logger.error(error.message, error.stack);
  throw new InternalServerErrorException();
}
```

This means:
- Every controller method manually catches and re-wraps custom errors into NestJS HTTP exceptions
- The `ErrorBase` class stores `errorGroup`, `code`, `message`, `timestamp`, `stack` but has **NO HTTP status code** — the controller decides the HTTP mapping
- Unhandled exceptions fall through to NestJS's default HTML error response
- No structured JSON envelope for all error responses
- Validation errors from `class-validator` would use NestJS default format (not yet configured)
- The `app/service/app.service.ts` throws `new Error('...')` on line 66 for the microservice case — completely untyped

### Affected Areas

- **`src/common/errors/error-base/error-base.ts`** — Core error class. Currently has no HTTP status. A `status` field needs to be added and propagated through the constructor.
- **`src/common/errors/error-base/error-base.types.ts`** — `IErrorPublic` type needs an optional `statusCode` field for the public envelope.
- **`src/common/errors/error-base/error-base.enums.ts`** — May need a status-to-group mapping or the errors themselves need to declare their status.
- **`src/common/errors/error/error-instances.error.ts`** — `GenericError` needs a default HTTP status.
- **`src/app/errors/error-instances.error.ts`** — `AppError`, `AppVersionNotFoundError` need status codes.
- **`src/entity/errors/error-instances.error.ts`** — All 5 entity errors need status codes.
- **`src/common/filters/` (NEW)** — Create `global-exception.filter.ts` implementing `ExceptionFilter`.
- **`src/app/app.module.ts`** — Register `APP_FILTER` provider for global scope.
- **`src/entity/controller/entity.controller.ts`** — Remove all try/catch blocks after global filter handles mapping.
- **`src/app/controller/app.controller.ts`** — Remove all try/catch blocks after global filter handles mapping.
- **`src/entity/controller/entity.controller.spec.ts`** — Update tests: expect consistent error envelope instead of `BadRequestException`/`InternalServerErrorException`.
- **`src/app/controller/app.controller.spec.ts`** — Same test updates.
- **`src/common/api-docs/defaults.decorator.ts`** — Update Swagger response decorators if the error envelope changes shape.
- **`src/common/errors/bad-request.error.ts`** — Swagger DTO for 400 responses (may need updating).
- **`src/common/errors/internal-server.error.ts`** — Swagger DTO for 500 responses (may need updating).

### Approaches

1. **Single Global ExceptionFilter + status-aware ErrorBase** — Extend `ErrorBase` to carry an HTTP `status` code. Create one `AllExceptionsFilter` that catches everything, maps `ErrorBase` subclass → their `status`, wraps `HttpException` subclasses → consistent envelope, and catches unknowns → 500. Register once via `APP_FILTER`.
   - Pros: Minimal code changes; leverages existing hierarchy; single point of maintenance; consistent envelope everywhere; removes ALL try/catch boilerplate from controllers; NestJS-standard approach
   - Cons: Requires updating every error class constructor to pass a status; existing tests that assert `BadRequestException` need to be rewritten to assert on envelope shape instead
   - Effort: **Medium** (~5-8 files changed, moderate refactor of tests)

2. **Multiple layered filters** — Separate filter for `HttpException`, one for `ErrorBase`, one fallback. Use `@Catch(HttpException)`, `@Catch(ErrorBase)`, `@Catch()` in order.
   - Pros: Separation of concerns; each filter is small
   - Cons: NestJS `@Catch()` ordering can be tricky; requires more files; still needs `ErrorBase` to know its HTTP status; overlapping concerns
   - Effort: **Medium**

3. **Interceptor-only approach** — Skip ExceptionFilter entirely, use a global `@Injectable()` interceptor that wraps controller execution and transforms errors in `catchError`.
   - Pros: Interceptors can handle both success and error responses
   - Cons: Interceptors run AFTER the controller but inside the request pipeline — filters are the standard NestJS mechanism for unhandled exceptions; interceptors can't catch framework-level errors (e.g., route not found); mixing concerns
   - Effort: **Low-Medium** (but incomplete — still needs a filter for framework errors)

4. **Middleware-based approach** — Catch errors in a middleware function that wraps the entire NestJS app.
   - Pros: Catches everything at the lowest level
   - Cons: Not NestJS-idiomatic; loses access to NestJS dependency injection (`@Inject()`, etc.); harder to test; no access to `ArgumentsHost` utilities
   - Effort: **Medium** (but not recommended)

### Recommendation

**Approach 1: Single Global ExceptionFilter + status-aware ErrorBase.**

Rationale:
- Most natural fit with the existing `ErrorBase` hierarchy
- Removes ALL try/catch boilerplate from controllers — that's the primary value proposition
- Single `@Catch()` filter is the standard NestJS pattern
- Requires minimal changes to the error hierarchy (just add `status` to `ErrorBase` and pass it from each subclass)
- The consistent JSON envelope becomes the contract for the entire API
- Future domain modules get error handling "for free" — just create an `ErrorBase` subclass with the right status

**Changes needed to ErrorBase:**
- Add `status: number` property to `ErrorBase`
- Accept it in the constructor or derive it from `errorGroup` via a mapping
- Add `statusCode` to `IErrorPublic`
- Each error subclass passes `status` (e.g., `HttpStatus.NOT_FOUND` for `EntityNotFoundError`)

**Changes needed in controllers:**
- Remove ALL try/catch blocks
- Let services throw `ErrorBase` subclasses directly
- Let unknown errors propagate to the global filter

**Changes needed in filter:**
- If `error instanceof ErrorBase`: use `error.status` as HTTP status, `getErrorPublic()` as body, add `timestamp` and `path`
- If `error instanceof HttpException`: extract status and response body, wrap in consistent envelope
- Otherwise (unexpected): log full error, return 500 with generic message

### Risks

- **Breaking change for API consumers**: The error response format WILL change. Current responses return NestJS's default format (e.g., `{ message, statusCode }`). After the filter, the format becomes the custom envelope. All API consumers need to be updated.
- **Existing tests will break**: Every spec that asserts `rejects.toThrow(BadRequestException)` needs to be updated to test against the response envelope instead of the exception type. This is test surface, not production risk, but it needs to be budgeted.
- **Missing error-to-status mapping**: Some `ErrorBase` subclasses may not have an obvious HTTP status (e.g., `GenericError`, `AppError`). Need a sensible default — likely `500` for base/generic errors.
- **`app/service/app.service.ts` line 66**: Uses `throw new Error(...)` for microservice unavailability — this is an untyped error that will fall into the 500 catch-all. Should be converted to an `ErrorBase` subclass with an appropriate status (e.g., `503` Service Unavailable).
- **ValidationPipe not configured**: There's no `ValidationPipe` at the application level (`main.ts`). If validation is added later, the filter needs to handle `BadRequestException` from class-validator correctly, preserving the validation error details.

### Ready for Proposal

Yes — the scope, approach, and affected areas are well-understood. The key architectual decision (Approach 1 — single global filter with status-aware ErrorBase) is clear and aligned with the existing codebase patterns.
