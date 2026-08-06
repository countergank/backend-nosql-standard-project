# Proposal: COU-213 — Parameter Store Runtime Configuration Management

## Intent

Port the battle-tested Parameter Store from countergank/api-user to enable runtime configuration management without redeploys. Replace hardcoded values (e.g., `EntityService.cacheTtlMs = 30_000`) with a registry-backed store supporting env overrides, Redis-backed persistence via existing `ICACHE_SERVICE`, and `parameter.changed` events for live consumers. Eliminate duplicate COU-192 (same idea) from team backlog.

## Scope

### In Scope
- `ParameterModule` (registry, store, service, `@Parameter()` decorator, types)
- `ParameterAdminModule` with versioned controller at `/v1/admin/parameters`
- Registry seeded with `ENTITY_CACHE_TTL_MS` (group `cache`) consumed by `EntityService`
- New `ErrorKind` entries: `PARAMETER_NOT_FOUND` (404), `PARAMETER_ENV_OVERRIDDEN` (409), `PARAMETER_INVALID_VALUE` (422)
- `@nestjs/event-emitter` dependency for `parameter.changed` events
- Minimal admin protection: `AdminApiKeyGuard` checking `ADMIN_API_TOKEN` header (placeholder, documented as swappable when auth module lands)
- Reuse `ICACHE_SERVICE` from COU-191 cache module (in-memory ↔ Redis via `REDIS_URL`)

### Out of Scope
- THROTTLE_* / EMAIL_* parameters (no consumers in this codebase)
- Full auth/RBAC (JWT, roles, user entity) — defer to separate auth change
- `@nestjs/throttler` (no throttling implementation exists)
- Distributed cache invalidation beyond per-instance in-memory provider (same as COU-191)
- Parameter UI / dashboard

## Capabilities

### New Capabilities
- `parameter-store`: Registry, store (L1 Map + env override + Redis via ICACHE_SERVICE), service (get/set/getAll/getByGroup/has/delete), `@Parameter()` decorator, static `ParameterService.instance` holder
- `parameter-admin`: Versioned admin controller (GET all, GET by group, PUT by key) with env-token guard

### Modified Capabilities
- `common-errors`: Add `PARAMETER_NOT_FOUND` (404), `PARAMETER_ENV_OVERRIDDEN` (409), `PARAMETER_INVALID_VALUE` (422) to `ErrorKind` registry
- `cache-module`: `ICACHE_SERVICE` reused as persistence backplane (no code change; note TTL unit conversion ms ↔ s)

## Approach

Port api-user's `ParameterModule`/`ParameterAdminModule` structure, adapting to local conventions:
- **Registry**: Compile-time `PARAMETER_DEFINITIONS` array (name, group, type, default, description, validation)
- **Store**: L1 in-memory Map → env override (`process.env`) → Redis via `ICACHE_SERVICE` (key prefix `param:`) → default. Writes invalidate L1 and emit `parameter.changed` via EventEmitter2.
- **Service**: Thin wrapper exposing get/set/getAll/getByGroup/has/delete + static `instance` for decorator.
- **Admin Controller**: `@Controller({ path: 'admin/parameters', version: '1' })` → `/v1/admin/parameters`. Endpoints: GET `/`, GET `/:group`, PUT `/:key`. Protected by `AdminApiKeyGuard` (checks `x-admin-token` header against `ADMIN_API_TOKEN` env var).
- **Error Handling**: Use `DomainError.fromKind` with new `ErrorKind` entries (consistent with project envelope).
- **TTL Conversion**: Cache module uses ms/PX; store converts to seconds for Redis EX (or keeps ms for PX — decide in design).
- **Biome Formatting**: Ported code must pass local lint (single quotes, 120 cols).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | Add `@nestjs/event-emitter` dependency |
| `src/config/env.validation.ts` | Modified | Document `ADMIN_API_TOKEN` optional env var |
| `src/common/errors/domain.error.ts` | Modified | Add 3 new `ErrorKind` entries |
| `src/common/cache/cache.service.ts` | None | `ICACHE_SERVICE` reused as-is (TTL conversion in store) |
| `src/entity/service/entity.service.ts` | Modified | Replace hardcoded `cacheTtlMs` with `@Parameter('ENTITY_CACHE_TTL_MS')` |
| `src/app/app.module.ts` | Modified | Import `ParameterModule`, `ParameterAdminModule` |
| `src/config/parameters/` | New | Full module structure (registry, store, service, decorator, admin, dto, api-docs, types) |
| `.env.example` | Modified | Document `ADMIN_API_TOKEN` and parameter env override pattern |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| No auth/RBAC — admin API unprotected without guard | High | Minimal `AdminApiKeyGuard` (env-token) as documented placeholder; swap when auth module lands |
| TTL unit mismatch (cache ms/PX vs store s/EX) | Medium | Explicit conversion in store; unit tests for both providers |
| In-memory provider is per-instance (no distributed invalidation) | Medium | Documented degradation; same as COU-191; Redis mode distributes via shared Redis |
| `@nestjs/event-emitter` new dependency | Low | Well-maintained NestJS package; optional injection pattern from api-user |
| COU-192 duplicate in backlog | Low | Recommend cancellation in favor of COU-213 (this change supersedes) |
| Env override returns raw strings (no coercion on read) | Medium | Decide in design: coerce in store.get() or document as caller responsibility |

## Rollback Plan

1. Remove `ParameterModule` and `ParameterAdminModule` imports from `AppModule`
2. Delete `src/config/parameters/` directory
3. Revert `EntityService` to hardcoded `cacheTtlMs = 30_000`
4. Remove 3 `ErrorKind` entries from `domain.error.ts`
5. Remove `@nestjs/event-emitter` from `package.json`
6. Remove `ADMIN_API_TOKEN` from `.env.example` and `env.validation.ts`

## Dependencies

- `@nestjs/event-emitter` (new, required for `parameter.changed` events)
- Existing `ICACHE_SERVICE` from COU-191 cache module (no new Redis client)
- `ioredis@5.11.1` already present as optionalDependency

## Success Criteria

- [ ] `EntityService` consumes `ENTITY_CACHE_TTL_MS` via `@Parameter()` decorator; changing it at runtime via `PUT /v1/admin/parameters/ENTITY_CACHE_TTL_MS` updates cache TTL without restart
- [ ] Admin endpoints return 401 without `x-admin-token` header matching `ADMIN_API_TOKEN`
- [ ] `parameter.changed` event emitted on successful PUT; consumer can subscribe
- [ ] Redis and in-memory modes both work (toggle via `REDIS_URL` presence)
- [ ] New `ErrorKind` entries produce correct envelope (statusCode/code/message)
- [ ] All unit tests pass; lint (Biome) and type-check pass
- [ ] COU-192 cancelled in Linear backlog

## Open Questions

1. **TTL conversion**: Store uses seconds for Redis EX or ms for PX? (api-user used s/EX; cache module uses ms/PX — recommend ms/PX for consistency with `ICACHE_SERVICE`)
2. **Env override coercion**: Coerce string env vars to declared type (number/boolean) in `store.get()` or leave raw? (recommend coerce for safety)
3. **Admin token header name**: `x-admin-token` vs `Authorization: Bearer <token>`? (recommend `x-admin-token` to avoid confusion with future JWT)