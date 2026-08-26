# Design: Structured Logging System (COU-190)

## Technical Approach

Replace three disjoint logging systems (Fastify Pino, NestJS ConsoleLogger, standalone Logger in AllExceptionsFilter) with a single `nestjs-pino` instance via `LoggerModule.forRoot()`. This unifies HTTP and application logging, propagates Fastify `req.id` (hyperid UUID) to all log entries automatically, and delegates Fastify logger config to `nestjs-pino`.

Key mappings from proposal:
- `pinoHttp.level` driven by `LOG_LEVEL` (prod: 'info', default) / `NODE_ENV=test` → 'silent'
- Dev: `pino-pretty` transport via `transport.target`
- Fastify `genReqId` → `hyperid().uuid` preserved; `nestjs-pino` reads `req.id` automatically
- Remove Fastify `logger` config from `main.ts`; delegate to `LoggerModule.forRoot()`
- Replace `CustomLogger` + `new Logger()` with `@InjectPinoLogger()` / `PinoLogger` DI

## Architecture Decisions

### Decision: Use `nestjs-pino` LoggerModule.forRoot() over manual Pino integration

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `nestjs-pino` (chosen) | Single DI token, auto `req.id` propagation, NestJS lifecycle hooks, built-in test silencing | ✅ Chosen |
| Manual `pino()` + custom NestJS logger | Full control, but manual correlation ID wiring, DI boilerplate | ❌ More boilerplate, error-prone correlation |
| Keep Fastify logger + custom NestJS logger | No change, but no correlation between HTTP and app logs | ❌ Doesn't solve correlation gap |

**Rationale**: `nestjs-pino` is the canonical integration maintained by Pino team. It handles Fastify `req.id` propagation automatically via `PinoLogger` injection context.

### Decision: Environment-driven `pinoHttp` config in `AppModule`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `forRoot({ pinoHttp: { ...env... } })` in AppModule (chosen) | Central config, test/dev/prod via env vars, single source of truth | ✅ Chosen |
| `forRootAsync()` with ConfigService | Dynamic config, more complex, overkill for env-driven static config | ❌ Over-engineering |
| Separate config file | Separation of concerns, but extra file for simple env mapping | ❌ Overhead |

**Rationale**: All config derives from `NODE_ENV`, `LOG_LEVEL`, `LOG_PRETTY` — simple env mapping doesn't need async factory.

### Decision: Remove `CustomLogger` entirely (no adapter pattern)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Delete `CustomLogger`, replace all usages with `@InjectPinoLogger()` (chosen) | Clean break, no legacy shim, forces migration | ✅ Chosen |
| Keep `CustomLogger` wrapping `PinoLogger` | Backward compatibility, but dual-write risk, confusion, dead code | ❌ Technical debt |

**Rationale**: Only 3 consumers (2 active, 1 dead). Mechanical replacement is trivial; adapter adds maintenance surface.

### Decision: `AllExceptionsFilter` injects `PinoLogger` via DI (not `new Logger()`)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inject `PinoLogger` via constructor (chosen) | Gets correlation ID from request context automatically | ✅ Chosen |
| Keep `new Logger()` + manual `req.id` pass | Loses automatic correlation, manual wiring | ❌ Defeats purpose |

**Rationale**: `nestjs-pino` attaches `req.id` to logger context via `PinoLogger` injection scope. Filter must be DI-registered (already is via `APP_FILTER`).

### Decision: Test silencing via `pinoHttp.level = 'silent'` when `NODE_ENV=test`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `pinoHttp.level: process.env.NODE_ENV === 'test' ? 'silent' : ...` (chosen) | Simple, no extra config, works with Jest `testEnvironment: node` | ✅ Chosen |
| Separate test config file | More explicit, but duplication | ❌ Unnecessary |
| `pino.destination(1)` + filter in test | Complex, fragile | ❌ Overkill |

**Rationale**: Pino's 'silent' level suppresses all output. Jest sets `NODE_ENV=test` by default.

## Data Flow

```
HTTP Request
    │
    ▼
Fastify genReqId() ──► req.id = hyperid().uuid()
    │
    ▼
nestjs-pino LoggerModule (single Pino instance)
    │                    │
    ├─► Fastify HTTP logs (req.id, method, url, statusCode, responseTime)
    │
    ▼
NestJS DI: @InjectPinoLogger() → PinoLogger
    │
    ├─► Services (EntityRepository, EncodeService, MicroserviceFactory)
    │       └─► log.debug/info/warn/error({ ...context, traceId: req.id })
    │
    └─► AllExceptionsFilter (injected PinoLogger)
            └─► catch() → log.error({ traceId, error, stack }, message)
```

Correlation ID (`req.id` / `traceId`) flows automatically via `nestjs-pino` context binding to `PinoLogger` instances created within request scope.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `nestjs-pino`, `pino`, `pino-pretty` (dev) |
| `src/app/app.module.ts` | Modify | Import `LoggerModule.forRoot()` with env-driven `pinoHttp` config |
| `src/main.ts` | Modify | Remove Fastify `logger` config; delegate to LoggerModule |
| `src/common/logger.ts` | Delete | Remove `CustomLogger` class (obsolete) |
| `src/common/filters/all-exceptions.filter.ts` | Modify | Inject `PinoLogger`; log structured errors with `traceId` |
| `src/entity/repository/entity.repository.ts` | Modify | Replace `CustomLogger` with `@InjectPinoLogger()` |
| `src/encode/encode.service.ts` | Modify | Remove unused `logger` property (dead code) |
| `src/config/custom-providers/microservice-provider.ts` | Modify | Replace `CustomLogger` with injected `PinoLogger` in factory |
| `test/**/*.spec.ts` | No change needed | `NODE_ENV=test` → `pinoHttp.level='silent'` silences automatically |

### Detailed File Changes

#### `package.json`
```json
{
  "dependencies": {
    "nestjs-pino": "^4.0.0",
    "pino": "^9.0.0"
  },
  "devDependencies": {
    "pino-pretty": "^11.0.0"
  }
}
```

#### `src/app/app.module.ts`
```typescript
import { LoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'test' ? 'silent' : (process.env.LOG_LEVEL ?? 'info'),
        transport:
          process.env.NODE_ENV !== 'production' && process.env.LOG_PRETTY !== 'false'
            ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
        autoLogging: false, // NestJS handles logging
      },
    }),
    // ... existing imports
  ],
})
export class AppModule implements NestModule { ... }
```

#### `src/main.ts`
```typescript
// REMOVE lines 16-25 (Fastify logger config)
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(), // No logger config here
);
```

#### `src/common/filters/all-exceptions.filter.ts`
```typescript
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
// ...
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(AllExceptionsFilter.name) private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    const traceId = (request.id as string) || 'unknown';
    const timestamp = new Date().toISOString();

    // ... existing status/code/message logic ...

    this.logger.error(
      { traceId, statusCode, code, message, details, timestamp, url: request.url, method: request.method },
      `Exception caught: ${message}`,
    );

    response.status(statusCode).send(errorResponse);
  }
}
```

#### `src/entity/repository/entity.repository.ts`
```typescript
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
// ...
@Injectable()
export class EntityRepository implements OnApplicationBootstrap {
  constructor(
    @InjectModel(Entity.name) private entityModel: Model<Entity>,
    private readonly encodeService: EncodeService,
    @InjectPinoLogger(EntityRepository.name) private readonly logger: PinoLogger,
  ) {}

  onApplicationBootstrap() {
    if (isLocal()) {
      this.populateEntitys().catch((error) => this.logger.error({ error }, 'Entity population failed'));
    }
  }
  // ... use this.logger.debug/info/warn/error with structured objects
}
```

#### `src/encode/encode.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
// REMOVE: import { CustomLogger } from '../common/logger';

@Injectable()
export class EncodeService {
  // REMOVE: private readonly logger = new CustomLogger(EncodeService.name);
  private SALT_ROUNDS = 10;

  hash(value: string): string { /* unchanged */ }
  compare(value: string, hash: string): boolean { /* unchanged */ }
}
```

#### `src/config/custom-providers/microservice-provider.ts`
```typescript
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
// ...
export const MicroserviceFactory = (name: MicroservicesNames) => {
  return {
    provide: String(name),
    useFactory: (
      configService: ConfigService,
      @InjectPinoLogger(String(name)) logger: PinoLogger,
    ) => {
      const microservice_enabled = configService.getOrThrow(`${name}_MICROSERVICE_ENABLED`);
      if (microservice_enabled === 'true') {
        // ... create client
      }
      logger.log(`${name} microservice is disabled by configuration.`);
      return null;
    },
    inject: [ConfigService],
  };
};
```

## Interfaces / Contracts

```typescript
// PinoLogger interface (from nestjs-pino)
interface PinoLogger {
  fatal(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  info(obj: object, msg?: string): void;
  debug(obj: object, msg?: string): void;
  trace(obj: object, msg?: string): void;
  child(bindings: object): PinoLogger;
  setBindings(bindings: object): void;
  level: string;
}
```

Log entry shape (production JSON):
```json
{
  "level": 30,
  "time": 1722000000000,
  "pid": 12345,
  "hostname": "host",
  "traceId": "abc-123-uuid",
  "context": "EntityRepository",
  "msg": "Entity population failed",
  "error": { "message": "duplicate key", "stack": "..." }
}
```

Dev pretty output (via `pino-pretty`):
```
[14:20:00.000] INFO  (12345 on host): Entity population failed
    traceId: abc-123-uuid
    context: EntityRepository
    error: { message: "duplicate key", stack: "..." }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | `AllExceptionsFilter` logs with `traceId` | Mock `PinoLogger`, verify `logger.error()` called with object containing `traceId` |
| Unit | `EntityRepository` uses injected logger | Mock `PinoLogger`, verify methods called with structured objects |
| Integration | HTTP request → log contains `req.id` | `supertest` request → capture stdout (dev) or parse JSON (prod) → assert `traceId` present |
| E2E | Test env silence | Run `npm test` → assert no Pino JSON lines in stdout |
| E2E | Dev pretty print | Run `npm run start:dev` → visually verify colored output (manual) |

**Test silencing**: Jest sets `NODE_ENV=test` → `pinoHttp.level='silent'` → zero output. No test changes needed.

## Threat Matrix

| Applicable? | Vector | Expected Safe Behavior | RED Test |
|-------------|--------|------------------------|----------|
| N/A | Routing / shell / subprocess / VCS / PR automation / executable classification / process integration | N/A — no routing, shell, subprocess, VCS, PR automation, executable classification, or process integration changes | — |

No routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundaries are modified by this change.

## Migration / Rollout

No migration needed — single commit replaces all logging in one atomic change. No feature flags, no phased rollout. Template project; no production data.

**Rollback**: Single commit revert restores `CustomLogger`, Fastify logger config, and all usages.

## Open Questions

- [ ] Confirm `nestjs-pino@4.x` compatibility with `@nestjs/platform-fastify@11.x` (peer deps)
- [ ] Verify `pino-pretty` transport options don't conflict with `redact`/`timestamp` config
- [ ] Confirm `autoLogging: false` doesn't suppress Fastify request logs (should be fine — Fastify logs via Pino directly)

## Next Step

Ready for tasks (sdd-tasks).