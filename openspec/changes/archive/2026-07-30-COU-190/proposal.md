# Proposal: Structured Logging System (COU-190)

## Intent

Current project has **three disjoint logging systems** that don't correlate:
1. Fastify HTTP logger (Pino, JSON, request IDs via `hyperid`)
2. NestJS `ConsoleLogger` (plain text, no correlation IDs)
3. `AllExceptionsFilter` uses standalone `new Logger()` — not DI, no correlation

**Gap**: Application logs (services, filters) cannot be correlated to HTTP requests. Developers cannot trace "error creating entity" back to the triggering request.

**Goal**: Single Pino instance for both HTTP and application logging with automatic correlation ID propagation from Fastify requests into all log entries.

## Scope

### In Scope
- Install `nestjs-pino` + `pino` + `pino-pretty` (dev)
- Configure `LoggerModule.forRoot()` in `AppModule` with env-driven `pinoHttp` options
- Replace `CustomLogger` usages with `@InjectPinoLogger()` / `PinoLogger` in:
  - `AllExceptionsFilter`
  - `EntityRepository`
  - `EncodeService` (remove dead logger)
  - `MicroserviceFactory`
- Remove Fastify adapter `logger` config from `main.ts` (delegate to LoggerModule)
- Configure test env to silence Pino (`pinoHttp.level = 'silent'` when `NODE_ENV=test`)
- Add `pino-pretty` target for local dev readability

### Out of Scope
- Log aggregation / Deferred
- OpenTelemetry / distributed tracing integration
- Log shipping (ELK, Loki, Datadog) — out of scope for template
- Custom log levels beyond Pino defaults
- File transport / log rotation

## Capabilities

### New Capabilities
- `structured-logging`: Pino-based structured JSON logging with automatic Fastify request ID correlation. Single logger instance for HTTP + app logs. Dev-friendly pretty printing via `pino-pretty`.

### Modified Capabilities
- `error-handling`: `AllExceptionsFilter` will use injected `PinoLogger` instead of standalone `Logger` for structured error logging with correlation IDs.
- `common-errors`: Exception filter behavior changes to log structured error context with trace ID.

## Approach

**Approach 1: `nestjs-pino`** (recommended in exploration)

- Single Pino instance shared between Fastify HTTP logger and NestJS app logger
- Auto-propagates Fastify `request.id` (`hyperid` UUID) into all log entries
- `LoggerModule.forRoot({ pinoHttp: { level: env, autoLogging: false } })` in `AppModule`
- Replace `CustomLogger` usages with `@InjectPinoLogger()` injection
- Test env: `pinoHttp.level = 'silent'` when `NODE_ENV=test`
- Dev env: `pino-pretty` transport for readable output

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | New | Add `nestjs-pino`, `pino`, `pino-pretty` (dev) |
| `src/app.module.ts` | Modified | Import `LoggerModule.forRoot()` with env config |
| `src/main.ts` | Modified | Remove Fastify `logger` config; delegate to LoggerModule |
| `src/common/logger.ts` | Removed | Delete `CustomLogger` class (obsolete) |
| `src/common/filters/all-exceptions.filter.ts` | Modified | Inject `PinoLogger`; log structured errors with trace ID |
| `src/entity/repository/entity.repository.ts` | Modified | Replace `CustomLogger` with injected `PinoLogger` |
| `src/encode/encode.service.ts` | Modified | Remove unused `logger` property |
| `src/config/custom-providers/microservice-provider.ts` | Modified | Replace `CustomLogger` with injected `PinoLogger` |
| `test/**/*.spec.ts` | Modified | Ensure Pino silenced in test env (no log noise) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking `CustomLogger` consumers | Low | Only 3 usages; one is dead code; migration is mechanical |
| Test log noise in CI | Medium | Configure `pinoHttp.level = 'silent'` when `NODE_ENV=test` |
| Fastify config migration gap | Low | Map existing `redact`, `timestamp`, `level` to `pinoHttp` options |
| `AllExceptionsFilter` standalone Logger | Medium | Must inject via DI; verify filter is registered as provider |
| Correlation ID field mismatch | Low | `nestjs-pino` expects `req.id`; `hyperid` via `genReqId` already sets it |

## Rollback Plan

1. Revert `package.json` (remove `nestjs-pino`, `pino`, `pino-pretty`)
2. Revert `AppModule` — remove `LoggerModule.forRoot()`
3. Restore `CustomLogger` class in `src/common/logger.ts`
4. Restore Fastify `logger` config in `main.ts`
5. Revert `AllExceptionsFilter`, `EntityRepository`, `EncodeService`, `MicroserviceFactory` to use `CustomLogger` / `new Logger()`
6. All changes are in ~8 files; single commit revert restores previous state

## Dependencies

- `nestjs-pino` (includes `pino` peer)
- `pino-pretty` (dev dependency)

## Success Criteria

- [ ] Single JSON log line per HTTP request includes `req.id`, `method`, `url`, `statusCode`, `responseTime`
- [ ] Application logs (services, filters) include same `req.id` for correlation
- [ ] `AllExceptionsFilter` logs structured error with trace context
- [ ] Dev env shows pretty-printed logs via `pino-pretty`
- [ ] Test env (`NODE_ENV=test`) produces zero log output from Pino
- [ ] No `CustomLogger` or `ConsoleLogger` references remain in source
- [ ] Integration tests pass without log noise in CI output

