## Exploration: Structured Logging System

### Current State

The project currently has **three separate logging concerns that don't talk to each other**:

1. **Fastify HTTP Logger** (Pino, built-in): Configured in `main.ts` with log level, redaction, and `hyperid`-based request IDs. Outputs structured JSON for HTTP request/response lifecycle.

2. **NestJS Application Logger** (`ConsoleLogger`, plain text): 
   - A `CustomLogger` class in `src/common/logger.ts` extends NestJS's `ConsoleLogger` and suppresses all log output during tests (unless `DEBUG=true`).
   - Used in 3 files: `entity.repository.ts` (seeding errors), `encode.service.ts` (declared but unused), `microservice-provider.ts` (init messages).
   - **`AllExceptionsFilter`** uses `new Logger()` directly from `@nestjs/common` — NOT `CustomLogger` — only for unknown error logging.

3. **No library for structured logging**: `package.json` has no `pino`, `winston`, or `nestjs-pino`. Only Fastify's bundled Pino is present.

**Key gap**: Fastify logs in JSON with request IDs; NestJS logs as unstructured text. Correlation IDs (`hyperid` UUIDs) exist in Fastify requests and in response headers via `TraceIdMiddleware`, but they never flow into NestJS's application logger. A developer cannot correlate "error creating entity" in a service with the HTTP request that triggered it.

### Affected Areas

- **`src/common/logger.ts`** — Current `CustomLogger` extends `ConsoleLogger`. Will be replaced or absorbed by Pino integration.
- **`src/common/filters/all-exceptions.filter.ts`** — Uses `new Logger()` directly. Needs to use the injected Pino logger for structured error logging.
- **`src/main.ts`** — Fastify adapter has `logger: { ... }` config. With `nestjs-pino`, this can be delegated to the Pino module.
- **`src/entity/repository/entity.repository.ts`** — Uses `CustomLogger` for seed errors. Would benefit from structured logging with trace context.
- **`src/encode/encode.service.ts`** — Declares `logger` but never calls it (dead code opportunity).
- **`src/config/custom-providers/microservice-provider.ts`** — Uses `CustomLogger` for init messages.
- **`package.json`** — Needs `nestjs-pino` and `pino` dependencies (and optionally `pino-pretty` for dev).
- **Test files** — No test currently asserts on log output. Integration tests create NestJS app without `logger: true`, so Fastify logs are already silent. Need to ensure Pino logger is suppressed in test environment.

### Approaches

1. **nestjs-pino** — Official NestJS + Pino integration via `LoggerModule.forRoot()`. Replaces NestJS `ConsoleLogger` globally with Pino. Integrates with Fastify's Pino instance automatically.
   - Pros: 
     - Single Pino instance for both HTTP and application logging
     - Automatic correlation ID propagation from Fastify requests into all log entries
     - JSON structured output by default (log aggregation ready)
     - `LoggerModule.forRoot({ pinoHttp: { autoLogging: false } })` for prod control
     - Silent mode in tests via `pinoHttp.level === 'silent'`
     - Forward-compatible with OpenTelemetry/distributed tracing
     - Already have `hyperid` for request IDs
   - Cons:
     - Adds 1 dependency (`nestjs-pino`, which includes `pino`)
     - Existing `CustomLogger` becomes obsolete — migration needed
     - `pino-pretty` needed for dev readability
   - Effort: **Low-Medium** (add dep, configure module, replace `CustomLogger` usages with `@InjectPinoLogger()`)
   - Total code changes: ~4-6 files

2. **Winston + `nest-winston`** — Winston-based NestJS logger module.
   - Pros: Very flexible transports (file, console, external services); huge ecosystem
   - Cons: No native Fastify integration (separate from Fastify's Pino); manual correlation ID plumbing; heavier dependency; more configuration boilerplate
   - Effort: **Medium** (more config, no Fastify alignment)
   - Total code changes: ~5-7 files

3. **Improve existing CustomLogger** — Enhance `ConsoleLogger` to output JSON and accept correlation IDs.
   - Pros: Zero new dependencies; no breaking change
   - Cons: Still doesn't integrate with Fastify's Pino (two separate log streams); need to reinvent structured formatting, log level management, redaction, etc.; hard to get right for production log aggregation; diverges from NestJS ecosystem convention
   - Effort: **Medium-High** (reinventing the wheel poorly)
   - Total code changes: ~3-5 files (but incomplete solution)

### Recommendation

**Approach 1: nestjs-pino.**

Rationale:
- This is a **template project** — the logging setup should be the standard, production-ready approach that downstream projects will use. `nestjs-pino` is the de facto standard in the NestJS ecosystem for structured logging.
- Aligns with existing Fastify adapter (both use Pino under the hood). No dual-logger problem.
- Correlation IDs from Fastify (already using `hyperid` via `genReqId`) flow automatically into application logs — this is the primary gap today.
- Test suppression is trivial: `pinoHttp.level = 'silent'` when `NODE_ENV=test`.
- The existing `CustomLogger` can be retired; current usages migrate to `@InjectPinoLogger()` or `PinoLogger`.
- Forward path to OpenTelemetry for distributed tracing when needed.

**Migration plan:**
- Install `nestjs-pino` (includes `pino`) and `pino-pretty` as dev dep
- Configure `LoggerModule.forRoot()` in `AppModule` with `pinoHttp` level based on env
- Remove `CustomLogger` class (or keep as thin wrapper if needed)
- Update `AllExceptionsFilter` to inject `PinoLogger` instead of `new Logger()`
- Update `EntityRepository`, `EncodeService`, `MicroserviceFactory` to use `PinoLogger`
- Remove Fastify adapter's `logger: { ... }` — delegate to LoggerModule
- Add `pino-pretty` target for dev/local environments

### Risks

- **Breaking change for existing CustomLogger consumers**: Three files use `CustomLogger`. The API changes from `this.logger.log(msg)` to `this.logger.log({ msg })` or `this.logger.info(msg)`. Low risk — only 3 usages, and one (`EncodeService`) is dead code.
- **Test setup needs to suppress Pino**: Integration tests use `FastifyAdapter` without explicit logger config. With `nestjs-pino`, the logger is replaced globally. Must configure `pinoHttp.level = 'silent'` in test env to prevent log noise in test output and CI logs.
- **Fastify adapter config migration**: The `logger: { redact, timestamp, level }` config in `main.ts` moves to `LoggerModule.forRoot()`. Need to ensure `redact` and `timestamp` behavior is preserved.
- **AllExceptionsFilter currently uses `new Logger()`**: This creates a standalone logger that is NOT replaced by `nestjs-pino`. Must change to inject `PinoLogger` via DI.
- **`hyperid` integration**: `genReqId` already uses `hyperid`. This continues to work with `nestjs-pino` but must verify the request ID field name matches what `nestjs-pino` expects (typically `req.id`).

### Ready for Proposal

Yes — the scope, approach, and migration path are clear. The recommendation (nestjs-pino) is the standard NestJS approach, aligns with the existing Fastify+Pino stack, and addresses the core gap (correlation ID propagation + structured output). Minimal risk for a template project.
