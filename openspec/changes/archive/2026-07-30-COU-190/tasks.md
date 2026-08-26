# Tasks: Structured Logging System (COU-190)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 120-150 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Install nestjs-pino + pino-pretty (dev) | PR 1 | npm install nestjs-pino pino pino-pretty (dev) | 1-min install, 2-min version compliance | Removes entire package.json integration |
| 2 | Configure LoggerModule.forRoot() in AppModule with env-driven settings | PR 1 | Verify app.module.ts LoggerModule.imports config with condition | npm run start:prod | All logging config in forRoot block |
| 3 | Update main.ts — remove Fastify logger config, let nestjs-pino handle it | PR 1 | npm run start:prod, verify Fastify logs + Pino correlation | 5-min dev startup test | Clean main.ts LoggerModule import |
| 4 | Delete src/common/logger.ts (CustomLogger) | PR 1 | rm src/common/logger.ts | 30-sec rm + verify imports | Remove obsolete logger file |
| 5 | Migrate AllExceptionsFilter to inject PinoLogger instead of new Logger() | PR 1 | npm run test:all-exceptions-filter | 10-sec Jest suite | Filter injection via @InjectPinoLogger() |
| 6 | Find and migrate any other service files using CustomLogger to PinoLogger | PR 1 | grep -R "CustomLogger" src && npm run test:entity-repository | 30-sec grep + 10-sec tests | Isolate affected files, update imports |
| 7 | Update tests to handle PinoLogger DI | PR 1 | npm run test:watch | 5-min test run | Ensure Pino silenced in test env |
| 8 | Verify build + all tests pass | PR 1 | npm run ci:test:all | 2-min CI run | Clean green build + test pass |

## Phase 1: Infrastructure / Foundation

- [x] 1.1 Install nestjs-pino, pino, and pino-pretty (dev dependency) in package.json
- [x] 1.2 Configure LoggerModule.forRoot() in src/app/app.module.ts with environment-driven pinoHttp settings:
  - Production: LEVEL = LOG_LEVEL (default: 'info')
  - Test: LEVEL = 'silent' when NODE_ENV=test
  - Dev: Enable pino-pretty transport if LOG_PRETTY != 'false'
  - Always: redact ['req.headers.authorization', 'req.headers.cookie'], timestamp, autoLogging: false
- [x] 1.3 Remove Fastify logger config from src/main.ts, delegate to LoggerModule
- [x] 1.4 Delete src/common/logger.ts (CustomLogger class) - no longer needed

## Phase 2: Core Implementation

- [x] 2.1 Migrate AllExceptionsFilter:
  - Replace new Logger() with constructor injection @InjectPinoLogger(AllExceptionsFilter.name)
  - Add traceId extraction from request.id for correlation
  - Keep existing error response logic, add structured logging
- [x] 2.2 Find and migrate all service files using CustomLogger:
  - src/entity/repository/entity.repository.ts - add @InjectPinoLogger() injection
  - src/encode/encode.service.ts - remove logger property (dead code)
  - src/config/custom-providers/microservice-provider.ts - replace CustomLogger with PinoLogger injection
- [x] 2.3 Update entity.repository.ts to use injected logger for structured logging with correlation context

## Phase 3: Testing / Verification

- [x] 3.1 Configure test environment to silence Pino (ensure NODE_ENV=test → pinoHttp.level='silent')
- [x] 3.2 Update existing all-exceptions.filter.spec.ts to mock PinoLogger, verify structured logging with traceId
- [x] 3.3 Update EntityRepository unit tests to provide PinoLogger via LoggerModule.forRoot()
- [x] 3.4 Run full test suite with Pino silenced in test environment

## Phase 4: Cleanup / Documentation

- [x] 4.1 Remove any leftover CustomLogger import statements not covered in Phase 2
- [x] 4.2 Update package-lock.json after dependencies update
- [x] 4.3 Verify no remaining ConsoleLogger or CustomLogger usage in source code via grep
- [x] 4.4 Validate rollback plan - single commit revert restores CustomLogger + Fastify config

## Next Step
Implementation complete - all tasks verified. Ready for verification (sdd-verify).
