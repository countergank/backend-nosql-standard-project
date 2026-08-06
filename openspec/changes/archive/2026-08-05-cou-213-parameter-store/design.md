# Design: COU-213 — Parameter Store Runtime Configuration Management

## Technical Approach

Port the battle-tested Parameter Store from `countergank/api-user` to enable runtime configuration without redeploys. Adapt to local conventions: dynamic module with `global: true` (matching `CacheModule`), reuse `ICACHE_SERVICE` as persistence backplane, `DomainError.fromKind` for error handling, URI versioning (`/v1/admin/parameters`), and Biome lint (single quotes, 120 cols). Seeds registry with `ENTITY_CACHE_TTL_MS` consumed by `EntityService` via `@Parameter()` decorator.

## Spec Reconciliation

The following spec deltas were corrected to align with the exploration findings and this design:

| Spec | Original (incorrect) | Corrected | Rationale |
|------|---------------------|-----------|-----------|
| `cache-module/spec.md` | TTL conversion ms→s for Redis EX (30000→30) | **ms/PX directly** — no conversion; `ICACHE_SERVICE.set(key, value, ttlMs)` | Exploration confirms `ICACHE_SERVICE` contract is ms/PX; conversion would introduce bugs |
| `parameter-store/spec.md` | Set writes "to L1 cache, env override, and Redis" | **Writes to Redis (via ICACHE_SERVICE) and invalidates L1** | Matches proposal & design: write-through to Redis, L1 invalidation (not write), env override is read-only |

## Architecture Decisions

| Decision | Option A | Option B | Tradeoff | Decision |
|----------|----------|----------|----------|----------|
| Global module | `@Global()` decorator (api-user) | Dynamic module `global: true` (CacheModule) | A: simpler, matches NestJS docs. B: matches local convention (CacheModule, ConfigModule), explicit factory control. | **B** — consistency with existing `CacheModule.forRoot()` pattern; allows future factory options. |
| TTL unit in store | Seconds + Redis EX (api-user) | Milliseconds + PX (ICACHE_SERVICE) | A: simpler TTL math. B: matches local cache contract (`ttlMs`), no conversion drift, PX is more precise. | **B (ms/PX)** — store accepts `ttlMs` from registry, passes directly to `ICACHE_SERVICE.set(key, value, ttlMs)`. |
| Env override coercion | Raw strings (api-user) | Coerce to declared type in `store.get()` | A: no hidden behavior. B: caller gets correct type (`number`/`boolean`), avoids downstream bugs. | **B (coerce in store)** — `store.get()` returns `string \| number \| boolean` matching registry `type`; uses `Number()`, `Boolean()` with validation. |
| Admin token header | `Authorization: Bearer` (future JWT) | `x-admin-token` (custom) | A: standard but collides with future auth. B: explicit, documented placeholder, no confusion. | **B (`x-admin-token`)** — documented as swappable; `AdminApiKeyGuard` reads header, compares to `ADMIN_API_TOKEN` env. |
| Route versioning | `/admin/parameters` (api-user) | `/v1/admin/parameters` (URI versioning) | A: matches reference exactly. B: matches local `EntityController` convention (`@Controller({ path: 'entity', version: '1' })`). | **B (`/v1/admin/parameters`)** — `@Controller({ path: 'admin/parameters', version: '1' })` enables versioning via `main.ts` config. |
| EventEmitter injection | Required (api-user) | `@Optional()` (graceful if missing) | A: fails fast if dep missing. B: store works without events (degraded); `@nestjs/event-emitter` is new dep. | **`@Optional()`** — if `EventEmitterModule` not imported, events silently no-op; documented. |

## Data Flow

### Read Path (L1 → Env Override → Redis via ICACHE_SERVICE → Default)

```
Consumer.get("ENTITY_CACHE_TTL_MS")
       │
       ▼
ParameterService.get(key)
       │
       ├─ L1 Map hit & not expired? ──→ return typed value
       │
       ├─ L1 miss/expired
       │   │
       │   ▼
       │   ConfigService.get(key) — env override?
       │   │
       │   ├─ Yes → coerce to registry type, cache in L1 (ttlMs from registry), return
       │   │
       │   └─ No
       │       │
       │       ▼
       │       ICACHE_SERVICE.get(`param:${key}`)
       │       │
       │       ├─ Hit → cache in L1, return
       │       │
       │       └─ Miss
       │           │
       │           ▼
       │       Registry.getDefault(key) → seed ICACHE_SERVICE (ttlMs), cache in L1, return
       │       │
       │       └─ No definition → throw PARAMETER_NOT_FOUND
       │
       ▼
Return typed value (string | number | boolean)
```

### Write Path (ICACHE_SERVICE + L1 Invalidation + Event)

```
Consumer.set("ENTITY_CACHE_TTL_MS", 60000)
       │
       ▼
ParameterService.set(key, value)
       │
       ├─ Registry.validate(key, value) → throws PARAMETER_INVALID_VALUE
       │
       ├─ ICACHE_SERVICE.set(`param:${key}`, value, ttlMs)
       │   │
       │   └─ Fail? → log warning, continue (graceful degradation)
       │
       ├─ L1.delete(key) — invalidate local cache
       │
       └─ EventEmitter.emit('parameter.changed', { key, value })
           │
           └─ If EventEmitterModule not loaded → no-op
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/config/parameters/parameter.types.ts` | Create | `ParameterType`, `ParameterDefinition`, `ParameterEntry`, `ParameterDecoratorOptions` interfaces |
| `src/config/parameters/parameter-definitions.ts` | Create | `PARAMETER_DEFINITIONS` constant — seeds `ENTITY_CACHE_TTL_MS` (group `cache`, number, default 30000, ttl 300000, description, **validate: positive number**) |
| `src/config/parameters/parameter-registry.ts` | Create | `ParameterRegistry` class — Map-based register/find/validate/getDefault/getTTL/has/getAll/findByGroup/listGroups |
| `src/config/parameters/parameter.store.ts` | Create | `ParameterStore` — L1 Map + `ICACHE_SERVICE` (`param:` prefix) + env override + `@Optional()` EventEmitter2; read/write/delete/getByKeys/has |
| `src/config/parameters/parameter.service.ts` | Create | `ParameterService` — get/set/getAll/getByGroup/has/delete + static `instance` + `ensureInitialized()` + `OnApplicationBootstrap` |
| `src/config/parameters/decorators/extract-parameter.helper.ts` | Create | `extractParameter(key, options?)` factory for `@Parameter()` decorator; uses `ParameterService.ensureInitialized()` |
| `src/config/parameters/decorators/parameter.decorator.ts` | Create | `@Parameter(key, options?)` param decorator via `createParamDecorator` |
| `src/config/parameters/decorators/index.ts` | Create | Barrel export for decorators |
| `src/config/parameters/dto/update-parameter.dto.ts` | Create | `UpdateParameterDto` with `value: string` (class-validator `@IsString() @IsNotEmpty()`) |
| `src/config/parameters/dto/parameter-entry.dto.ts` | Create | `ParameterEntryDto` for admin API response (OpenAPI) |
| `src/config/parameters/api-docs/parameter-admin.docs.ts` | Create | Swagger decorators via `applyDecorators` for admin endpoints |
| `src/config/parameters/parameter-admin.guard.ts` | Create | `AdminApiKeyGuard` — reads `x-admin-token` header, validates against `ADMIN_API_TOKEN` env; **throws `UnauthorizedException` with `WWW-Authenticate` header on missing/invalid token** |
| `src/config/parameters/parameter-admin.controller.ts` | Create | `@Controller({ path: 'admin/parameters', version: '1' })` — GET `/`, GET `/:group`, PUT `/:key`; throws `DomainError.fromKind` for 404/409/422 |
| `src/config/parameters/parameter-admin.module.ts` | Create | Imports `ParameterModule`, declares `ParameterAdminController` |
| `src/config/parameters/parameter.module.ts` | Create | Dynamic module `forRoot()` with `global: true`; providers: Registry (factory), Store, Service; exports all three |
| `src/config/parameters/index.ts` | Create | Barrel export |
| `src/entity/service/entity.service.ts` | Modify | Replace `private readonly cacheTtlMs = 30_000` with `@Parameter('ENTITY_CACHE_TTL_MS') cacheTtlMs: number`; fallback to 30000 if undefined |
| `src/common/errors/domain.error.ts` | Modify | Add `PARAMETER_NOT_FOUND` (404), `PARAMETER_ENV_OVERRIDDEN` (409), `PARAMETER_INVALID_VALUE` (422) to `ErrorKind`; **`GenericError` enhanced with optional `status?: number` (default 500) per common-errors spec** |
| `src/config/env.validation.ts` | Modify | Add optional `ADMIN_API_TOKEN: string` to `EnvironmentVariables` class |
| `src/app/app.module.ts` | Modify | Import `ParameterModule.forRoot()`, `ParameterAdminModule`; add `EventEmitterModule.forRoot()` |
| `package.json` | Modify | Add `@nestjs/event-emitter` dependency |
| `.env.example` | Modify | Document `ADMIN_API_TOKEN` and env override pattern `ENTITY_CACHE_TTL_MS=60000` |

## Interfaces / Contracts

```typescript
// parameter.types.ts
export type ParameterType = 'string' | 'number' | 'boolean';

export interface ParameterDefinition<T = string | number | boolean> {
  key: string;
  type: ParameterType;
  default: T;
  group: string;
  ttl: number;                    // milliseconds (ms)
  description?: string;
  validate?: (value: T) => boolean;
}

export interface ParameterEntry {
  key: string;
  type: ParameterType;
  value: string | number | boolean;
  default: string | number | boolean;
  group: string;
  ttl: number;                    // milliseconds
  isOverridden: boolean;
}

export interface ParameterDecoratorOptions {
  strict?: boolean;               // throw if parameter not registered
}
```

```typescript
// parameter.store.ts
const PARAMETER_PREFIX = 'param:';
export const PARAMETER_CHANGED_EVENT = 'parameter.changed';

@Injectable()
export class ParameterStore {
  async get(key: string): Promise<string | number | boolean>;
  async set(key: string, value: string | number | boolean): Promise<void>;
  async getByKeys(keys: string[]): Promise<Map<string, string | number | boolean>>;
  has(key: string): boolean;
  async delete(key: string): Promise<void>;
}
```

```typescript
// parameter.service.ts
@Injectable()
export class ParameterService implements OnApplicationBootstrap {
  static instance: ParameterService | null = null;
  static ensureInitialized(): ParameterService;

  onApplicationBootstrap(): void;

  async get(key: string): Promise<string | number | boolean>;
  async set(key: string, value: string | number | boolean): Promise<void>;
  async getAll(): Promise<ParameterEntry[]>;
  async getByGroup(group: string): Promise<ParameterEntry[]>;
  has(key: string): boolean;
  async delete(key: string): Promise<void>;
}
```

```typescript
// parameter-admin.controller.ts
@Controller({ path: 'admin/parameters', version: '1' })
@UseGuards(AdminApiKeyGuard)
export class ParameterAdminController {
  @Get()
  @ApiDocs.getAllParameters()
  async findAll(): Promise<ParameterEntryDto[]>;

  @Get(':group')
  @ApiDocs.getParametersByGroup()
  async findByGroup(@Param('group') group: string): Promise<ParameterEntryDto[]>;

  @Put(':key')
  @ApiDocs.updateParameter()
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateParameterDto,
  ): Promise<ParameterEntryDto>;
}
```

```typescript
// parameter-admin.guard.ts
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-admin-token'];
    const expected = this.configService.get<string>('ADMIN_API_TOKEN');

    if (!expected || token !== expected) {
      const response = context.switchToHttp().getResponse();
      response.setHeader('WWW-Authenticate', 'Bearer realm="admin"');
      throw new UnauthorizedException('Invalid or missing admin token');
    }
    return true;
  }
}
```

```typescript
// domain.error.ts (GenericError enhancement)
export class GenericError extends Error {
  readonly code: string;
  readonly status: number;
  readonly timestamp: string;
  readonly traceId: string;

  constructor(e?: unknown, status?: number) {
    super(e instanceof Error ? e.message : String(e));
    this.name = 'GenericError';
    this.code = 'GENERIC_ERROR';
    this.status = status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    this.timestamp = new Date().toISOString();
    this.traceId = randomUUID();
  }

  getErrorPublic(): { statusCode: number; code: string; message: string; traceId: string; timestamp: string } {
    return {
      statusCode: this.status,
      code: this.code,
      message: this.message,
      traceId: this.traceId,
      timestamp: this.timestamp,
    };
  }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `parameter-registry.ts`: register, duplicate rejection, type validation, group queries, getDefault/getTTL/has | Jest — pure functions, no I/O mocks |
| Unit | `parameter.store.ts`: L1 hit/miss/expire, env override (coercion), ICACHE_SERVICE delegation (ms/PX), Redis seed default, graceful degradation (ICACHE_SERVICE returns null/error), L1 invalidation on set/delete, `parameter.changed` event emission (with/without EventEmitter) | Jest — mock `ICACHE_SERVICE`, `ConfigService`, `@Optional()` `EventEmitter2`, `ParameterRegistry` |
| Unit | `parameter.service.ts`: get/set/getAll/getByGroup/has/delete integration, validation enforcement, static `instance` lifecycle | Jest — mock `ParameterStore`, `ParameterRegistry` |
| Unit | `parameter.decorator.ts` + `extract-parameter.helper.ts`: strict/non-strict mode, `ensureInitialized()` throws before bootstrap, returns typed value | Jest — mock `ParameterService.ensureInitialized()` |
| Unit | `parameter-admin.guard.ts`: valid token → true, **missing/invalid token → throws UnauthorizedException with WWW-Authenticate header**, missing `ADMIN_API_TOKEN` env → throws UnauthorizedException | Jest — mock `ConfigService`, `ExecutionContext`, `HttpAdapterHost` |
| Unit | `parameter-admin.controller.ts`: GET all, GET by group, PUT success, PUT 404 (unknown key), PUT 409 (env overridden), PUT 422 (invalid coercion) | Jest — mock `ParameterService`, `ParameterRegistry`; test `DomainError.fromKind` thrown |
| Integration | Full read/write flow with real `InMemoryCacheProvider` (no Redis) | `Test.createTestingModule()` with `ParameterModule.forRoot()`, real providers |
| E2E | Admin API: `GET /v1/admin/parameters`, `GET /v1/admin/parameters/cache`, `PUT /v1/admin/parameters/ENTITY_CACHE_TTL_MS` with `x-admin-token` header; **verify 401 + WWW-Authenticate header without token**, 404/409/422 error envelopes, `parameter.changed` event via EventEmitter subscription | Supertest + real `AppModule` with `EventEmitterModule.forRoot()` |

**TDD**: RED-GREEN-REFACTOR per task. Write test first (fails), implement (passes), refactor. Strict TDD per `openspec/config.yaml`. Biome lint: single quotes, 120 cols, no unused imports.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Redis keys are ephemeral (TTL-bounded). On first deploy:
1. Redis/in-memory empty → store seeds defaults on first access per spec.
2. `EntityService` consumes `@Parameter('ENTITY_CACHE_TTL_MS')` with fallback — transparent to existing behavior.
3. `ADMIN_API_TOKEN` optional — admin endpoints return 401 if not set (safe default).
4. COU-192 cancelled in Linear backlog (superseded by this change).

## Open Questions — Resolved

| # | Question | Resolution | Rationale |
|---|----------|------------|-----------|
| 1 | TTL conversion: seconds/EX vs ms/PX? | **ms/PX** — store uses `ttlMs` from registry, passes directly to `ICACHE_SERVICE.set(key, value, ttlMs)` | Matches `ICACHE_SERVICE` contract (`ttlMs`, PX), avoids conversion bugs, higher precision |
| 2 | Env override coercion: raw string or coerce? | **Coerce in `store.get()`** — return `string \| number \| boolean` matching registry `type` | Caller gets correct type; prevents downstream `Number()`/`Boolean()` bugs; validation fails fast |
| 3 | Admin token header: `Authorization: Bearer` vs `x-admin-token`? | **`x-admin-token`** — custom header, documented as placeholder until auth module lands | Avoids collision with future JWT; explicit contract; `AdminApiKeyGuard` is ~20 lines, trivially swappable |

## New Decisions (Not in Proposal)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| EventEmitter injection | `@Optional()` | Allows store to work without `@nestjs/event-emitter` if module not imported (degraded: no events, no crash) |
| Registry TTL default | 300,000 ms (5 min) | Matches api-user's 300s but in ms; long enough for config stability, short enough for runtime updates |
| ParameterModule factory | `forRoot()` with optional `ParameterModuleOptions` | Future-proof: allows overriding registry, prefix, or event name without breaking changes |
| Admin controller error mapping | `DomainError.fromKind` for all 3 new kinds | Consistent with project envelope (`AllExceptionsFilter`); no raw Nest `HttpException` |
| EntityService fallback | `cacheTtlMs = 30_000` if parameter returns undefined | Defensive: parameter store may not be ready during early bootstrap; maintains current behavior |
| Swagger docs location | `src/config/parameters/api-docs/parameter-admin.docs.ts` | Matches local convention (`entity/api-docs/*.decorator.ts`) |
| Key prefix | `param:` (not `cache:`) | Avoids collision with `CacheModule`'s `cache:` prefix; independent namespace/TTL/eviction |
| ENTITY_CACHE_TTL_MS validation | `(v) => typeof v === 'number' && Number.isFinite(v) && v > 0` | Ensures positive finite number; negative/non-number → 422 PARAMETER_INVALID_VALUE per spec |
| GenericError status field | `status?: number` (default 500) | Per common-errors spec MODIFIED requirement; `getErrorPublic()` includes statusCode |