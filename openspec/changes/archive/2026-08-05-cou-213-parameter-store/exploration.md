## Exploration: Parameter Store — Runtime Configuration Management (port from api-user)

### Current State

Reference implementation (countergank/api-user `src/config/parameters/`) mapped in full:
- `ParameterModule` `@Global()` — registry (compile-time `PARAMETER_DEFINITIONS`, 14 params in email+throttle groups), `ParameterStore` (L1 Map + Redis `param:` prefix + env override; read priority L1 → env override → Redis → default; writes invalidate L1 and emit `parameter.changed` via EventEmitter2), `ParameterService` (get/set/getAll/getByGroup/has/delete + static `instance` holder for the `@Parameter()` decorator).
- `ParameterAdminModule` — `admin/parameters` controller: GET all, GET `:group`, PUT `:key` (404 unknown key, 409 env-overridden, 422 invalid coercion), protected by `JwtAuthGuard` + `RolesGuard` with `@Roles(UserRole.ADMIN)`, `@Throttle` decorators, `@AuditAction`.
- `@Parameter(key, { strict? })` decorator + `extractParameter` helper (uses `ParameterService.ensureInitialized()`).
- Consumers in api-user: `DynamicThrottlerGuard` (THROTTLE_*) and email provider factory (EMAIL_*). 7 unit spec files, no e2e.

THIS codebase (backend-nosql-standard-project) state:
- **Config infra**: `src/config/env.validation.ts` — class-validator `validate()`; validated vars: HOST/PORT/DEBUG optional, NODE_ENV (required enum), VERSION (required), DATABASE_* (required), ENCRYPTION_PASSWORD (required), EXAMPLE_MICROSERVICE_HOST/PORT optional, `REDIS_URL` optional (added by COU-191). `ConfigModuleOption` (`src/config/custom-module-options/config-module-option.ts`): `isGlobal: true, cache: true, envFilePath: .env.${NODE_ENV}, ignoreEnvFile in prod`. Custom module option classes exist as the convention.
- **Optional Redis (COU-191, merged)**: `src/common/cache/cache.module.ts` `CacheModule.forRoot()` — dynamic module with `global: true` metadata; factory picks `RedisCacheProvider` (ioredis, `lazyConnect`, `maxRetriesPerRequest: 1`, `retryStrategy: () => null`, fire-and-forget connect) when `REDIS_URL` present, else `InMemoryCacheProvider` (Map + TTL + 30s sweep `unref`). Exposes `ICACHE_SERVICE` (get<T>/set<T>(ttlMs)/del/reset). `ioredis@5.11.1` is an **optionalDependency**, installed locally. Errors degrade gracefully (log + return null). NOTE: there is NO `RedisService` in this project — the cache module owns its client.
- **Auth/RBAC**: NONE. No `@nestjs/jwt`, no passport, no guards, no roles, no user entity with roles (entity has only userName/email). grep for Guard/jwt/passport/Roles across `src/` returns zero matches.
- **Throttling**: NONE. No `@nestjs/throttler`, no guards. (nestjs-backend skill P1 sec rule "Rate limiting" exists but is not implemented.)
- **EventEmitter2**: NOT installed, NOT used anywhere.
- **Global module convention**: NO `@Global()` decorator usage. Global scope is achieved via dynamic module `global: true` (CacheModule) and `isGlobal: true` (ConfigModule). AppModule registers: LoggerModule, ConfigModule.forRoot(ConfigModuleOption), MongooseModule.forRootAsync, CacheModule.forRoot(), EntityModule.
- **Routes**: URI versioning enabled in `main.ts` (`VersioningType.URI`). Entity controller: `@Controller({ path: 'entity', version: '1' })` → `/v1/entity`. Root controller: `@Controller({ version: [VERSION_NEUTRAL] })`. Swagger decorators live in per-module `api-docs/*.decorator.ts` via `applyDecorators`. DTOs in `dto/` with class-validator. Controllers are thin.
- **Errors**: `DomainError.fromKind(kind)` with `ErrorKind` registry (`src/common/errors/domain.error.ts`), mapped to an envelope (statusCode/code/message/traceId/timestamp) by `AllExceptionsFilter`; Nest `HttpException`s also handled (code `UA-HTTP-{status}`).
- **Testing**: unit specs in `src/` (ts-jest, 30s timeout), e2e infra exists (`test/jest-e2e.json`, `app.e2e-spec.ts`, `test/helpers/`). Strict TDD via openspec config (`strict_tdd: true`).

### Affected Areas

- `package.json` — add `@nestjs/event-emitter` (required for `parameter.changed` events); optionally `@nestjs/throttler` if throttling params are added.
- `src/config/env.validation.ts` — no change strictly required (REDIS_URL already optional); only if new env vars are introduced.
- `src/common/cache/cache.service.ts` + `cache.module.ts` — the `ICACHE_SERVICE` abstraction is the natural persistence backplane for the store (reuse, do not add a second Redis client).
- `src/common/errors/domain.error.ts` — new `ErrorKind` entries for 404/409/422 parameter errors (or rely on Nest HttpExceptions, which the filter already handles).
- `src/entity/service/entity.service.ts` — `cacheTtlMs = 30_000` hardcoded; candidate first parameter (e.g., `ENTITY_CACHE_TTL_MS`, group `cache`).
- `src/common/cache/cache.service.ts` — `defaultTtlMs = 60_000` and `cleanupIntervalMs = 30_000` hardcoded; secondary candidates.
- `src/app/app.module.ts` — register the new module(s).
- New dirs: `src/config/parameters/` (module, registry, store, service, types, definitions, decorators, dto, api-docs) and admin controller.
- `.env.example` — document that env vars override parameters (e.g., `ENTITY_CACHE_TTL_MS`).

### Approaches

1. **Full port, adapted to optional Redis** — port registry/store/service/admin controller/decorator; store writes Redis through `ICACHE_SERVICE` instead of a `RedisService` (none exists); TTL converted ms↔s; `param:` prefix handled by the store; events via new `@nestjs/event-emitter` dependency with `@Optional()` injection (api-user pattern); registry seeded with a small set of real params (`ENTITY_CACHE_TTL_MS`, etc.) instead of api-user's email/throttle params.
   - Pros: matches reference shape, reusable across future consumers, events + env-override semantics preserved, reuses battle-tested optional-Redis pattern
   - Cons: adds a dependency; admin endpoints unprotected without auth (see Risks)
   - Effort: **Medium-High**

2. **Minimal core (no admin controller, no events)** — module + registry + store (L1/env/in-memory fallback only) + service + decorator; no HTTP surface, no EventEmitter2 dependency.
   - Pros: zero new deps, smallest surface, still unblocks `@Parameter()` consumers
   - Cons: loses runtime mutation + admin UX that justify a Parameter Store vs plain env vars; events are core to "change at runtime" story
   - Effort: **Low-Medium**

3. **Full port + minimal admin protection** — Approach 1 plus a simple guard for `admin/parameters` (e.g., shared-secret header token via env `ADMIN_API_TOKEN`, validated by a small `AdminApiKeyGuard`), documented as placeholder until a real auth module exists.
   - Pros: complete parity with api-user UX, admin routes not wide open, guard is ~20 lines and swappable when auth lands
   - Cons: custom security mechanism (not JWT/roles); template consumers must know to replace it
   - Effort: **Medium-High**

### Recommendation

**Approach 3** (full port, Redis-optional via `ICACHE_SERVICE`, `parameter.changed` events via new `@nestjs/event-emitter`, admin controller protected by a minimal env-token guard as a documented placeholder). Rationale:
- Reuses the established optional-Redis pattern from COU-191 instead of re-inventing it — the store only needs get/set/del, which `ICACHE_SERVICE` already provides with graceful degradation; no second ioredis client.
- The local convention for errors is `DomainError.fromKind`; use new kinds (`PARAMETER_NOT_FOUND` 404, `PARAMETER_ENV_OVERRIDDEN` 409, `PARAMETER_INVALID_VALUE` 422) so responses match the project envelope (api-user's plain Nest HttpExceptions would also work but are off-convention).
- Controller versioning: `@Controller({ path: 'admin/parameters', version: '1' })` to match entity convention (→ `/v1/admin/parameters`), or version-neutral if api-user route parity (`/admin/parameters`) is preferred — decide in design.
- Registry seeds a small real set: `ENTITY_CACHE_TTL_MS` (group `cache`) consumed by `EntityService`, plus `CACHE_DEFAULT_TTL_MS` if desired; THROTTLE_*/EMAIL_* params have NO consumers here — do not port them.
- The static `ParameterService.instance` + decorator pattern is ExecutionContext-agnostic and works on Fastify.

### Risks

- **CRITICAL — No auth/RBAC in this project**: `admin/parameters` in api-user is JwtAuthGuard + RolesGuard(ADMIN). Nothing equivalent exists here; an unprotected parameter API is a security hole (write access to runtime config). Mitigation: minimal env-token guard as placeholder + explicit design decision.
- **CRITICAL — No `RedisService`**: store must be adapted to `ICACHE_SERVICE`. TTL units differ (`cache.service` uses ms/PX, api-user store uses seconds/EX) — conversion bug risk. In-memory provider is per-instance (no distribution) — documented degradation, same as COU-191.
- **No `@nestjs/event-emitter`**: new dependency must be added; alternatively drop events (Approach 2 loses them).
- **No `@nestjs/throttler`**: porting THROTTLE_* params without a throttler is dead code — excluded from registry.
- **Env override coercion**: api-user returns raw env strings for number/boolean params (no coercion on read) — mismatch between declared type and runtime value; decide whether to coerce in this port.
- **COU-192** in team backlog is the same idea — evaluate cancelling to avoid duplicate work.
- **Biome vs ESLint**: api-user reference code style is ESLint; this project uses Biome (line width 120, single quotes) — the port must be reformatted to local conventions or CI lint fails.

### Ready for Proposal

**Yes** — the reference is fully mapped, the optional-Redis adaptation is proven by COU-191, and the gaps are enumerated. The orchestrator should tell the user: proposal phase must decide (a) admin route protection strategy (minimal token guard vs defer admin controller to an auth-bearing change), (b) whether to add `@nestjs/event-emitter` or drop events, (c) route versioning (`/v1/admin/parameters` vs `/admin/parameters`), (d) confirm COU-192 cancellation, and (e) registry seed set (recommend `ENTITY_CACHE_TTL_MS` only, consumed by EntityService).
