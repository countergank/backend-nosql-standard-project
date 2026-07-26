# Proposal: COU-189 Error Handling System

## Intent

The project has a custom `ErrorBase` hierarchy (3 groups, ~8 classes) but **zero global exception filtering**. Every controller method manually catches and wraps errors into NestJS HTTP exceptions, producing inconsistent responses. Unhandled exceptions leak NestJS's default HTML error page. Stack traces leak in production. No structured JSON envelope exists for API consumers.

## Scope

### In Scope
- Extend `ErrorBase` with `status: number` property propagated through all ~8 error subclasses
- Single `GlobalExceptionFilter` via `@Catch(ErrorBase, HttpException)` registered as `APP_FILTER`
- Consistent JSON envelope: `{ statusCode, code, message, details?, traceId, timestamp }`
- `TraceIdMiddleware` generating UUID per request (added to envelope and request headers)
- Environment-aware stack traces: `NODE_ENV !== 'production'` only
- `ValidationPipe` integration at app level for structured 422 validation errors
- Remove ALL try/catch boilerplate from `entity.controller.ts` and `app.controller.ts`
- Fix `app.service.ts:66` untyped `throw new Error()` → proper `ErrorBase` subclass
- Update controller tests to assert on envelope shape, not exception types

### Out of Scope
- Logging integration (deferred to COU-190)
- Cache integration (deferred to COU-191)
- Parameter store (deferred to COU-192)
- OpenAPI/Swagger error response updates (separate chore)

## Capabilities

### New Capabilities
- `error-handling`: centralized exception handling, error envelope, traceId middleware

### Modified Capabilities
- None — existing specs are for tooling/linting; no behavior specs exist yet

## Approach

Extend `ErrorBase` with required `status` field. Each subclass passes its HTTP status (e.g., `EntityNotFoundError` → 404, `EntityNameAlreadyExistsError` → 409). Single `GlobalExceptionFilter`:
- `ErrorBase` instances → use `error.status`, `error.getErrorPublic()` as envelope body
- `HttpException` subclasses → extract status and response, wrap in envelope
- Unknown errors → log full error, return 500 envelope with generic message

Register filter via `APP_FILTER` in `AppModule`. Add `TraceIdMiddleware` before filter in `main.ts`. Configure global `ValidationPipe` with `exceptionFactory` that produces structured validation errors.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/common/errors/error-base/error-base.ts` | Modified | Add `status` property, update constructor, add to `IErrorPublic` |
| `src/common/errors/*/error-instances.error.ts` (3 files) | Modified | Pass `status` to each subclass constructor |
| `src/common/filters/global-exception.filter.ts` | New | Single global exception filter |
| `src/common/middleware/trace-id.middleware.ts` | New | UUID traceId per request |
| `src/app/app.module.ts` | Modified | Register `APP_FILTER` and `ValidationPipe` |
| `src/main.ts` | Modified | Add `TraceIdMiddleware` |
| `src/app/controller/app.controller.ts` | Modified | Remove all try/catch blocks |
| `src/entity/controller/entity.controller.ts` | Modified | Remove all try/catch blocks |
| `src/app/service/app.service.ts` | Modified | Replace `throw new Error()` with typed error |
| `src/**/*.spec.ts` (2 files) | Modified | Update assertions to envelope shape |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking API consumers (envelope shape change) | High | Document new envelope in changelog; coordinate with consumers; consider versioning |
| Existing controller tests break (assert on exception type) | High | Update tests in same PR; budget ~30 min per test file |
| Missing status mapping on some ErrorBase subclasses | Medium | Default to 500 for base classes; explicit mapping for domain errors |
| Untyped errors in services falling to 500 catch-all | Low | Convert `app.service.ts:66` and audit for others |

## Rollback Plan

1. Revert `AppModule` provider registration (remove `APP_FILTER`, `ValidationPipe`)
2. Revert `main.ts` (remove `TraceIdMiddleware`)
3. Restore try/catch blocks in controllers from git history
4. Revert `ErrorBase` and subclasses to pre-change state (remove `status`)
5. All changes are additive except test assertions — git revert restores cleanly

## Dependencies

- `uuid` package (for traceId) — already in deps
- NestJS `@nestjs/common` — already available
- No external dependencies added

## Success Criteria

- [ ] GlobalExceptionFilter catches all `ErrorBase` and `HttpException`
- [ ] All 8 existing error instances return proper envelope with correct statusCode
- [ ] `traceId` present in every error response and request header
- [ ] Stack traces ONLY in development (`NODE_ENV !== 'production'`)
- [ ] ValidationPipe returns structured 422 with validation details
- [ ] All existing controller tests pass with updated envelope assertions
- [ ] Zero try/catch blocks remain in `entity.controller.ts` and `app.controller.ts`