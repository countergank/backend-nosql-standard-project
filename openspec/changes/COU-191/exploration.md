## Exploration: Cache Service with optional Redis

### Current State

**Zero cache infrastructure exists today.** The project has:
- No Redis service in `docker-compose.yml` (only MongoDB + API)
- No cache libraries in `package.json` dependencies (`@nestjs/cache-manager`, `cache-manager`, `ioredis`, etc. are all absent)
- No `REDIS_URL` or cache-related environment variables in `.env`, `.env.example`, or `.env.test`
- No cache service, module, or utility anywhere in `src/`
- The `ConfigModuleOption` has `cache: true`, but that's only NestJS ConfigModule's internal cache (environment variable lookups), not application-level caching
- The `env.validation.ts` class has no Redis-related fields

**Existing conventions that touch caching:**
- Project skill rule `p2-caching.md` (`.agents/skills/nestjs-backend/rules/operations/p2-caching.md`) recommends `@nestjs/cache-manager` with `@UseInterceptors(CacheInterceptor)` and `@CacheTTL()`
- The SKILL.md quick reference (ops-002) says: "CacheModule for simple, Redis for distributed"
- COU-189 proposal explicitly deferred cache to COU-191

### Affected Areas

- **`package.json`** — Needs `@nestjs/cache-manager` + `cache-manager` (core deps). Optionally `ioredis` or `@keyv/redis` for Redis support.
- **`src/common/cache/`** — New directory: `cache.module.ts`, `cache.service.ts`, `cache.service.spec.ts`
- **`src/config/env.validation.ts`** — Add `@IsOptional() REDIS_URL: string` to `EnvironmentVariables` class
- **`.env.example`** — Add `# REDIS_URL=redis://localhost:6379` optional entry
- **`.env.test`** — No Redis in CI; keep it clean (no REDIS_URL set)
- **`docker-compose.yml`** — *Not* adding Redis (template project keeps it optional); should document how to add Redis service
- **`src/app/app.module.ts`** — Potential change: import `CacheModule` if using `@nestjs/cache-manager`
- **`src/entity/service/entity.service.ts`** — Potential consumer: cache `findAll`/`findById` results
- **`src/app/service/app.service.ts`** — Potential consumer: cache health check results

### Approaches

1. **Custom CacheService with environment-driven backend** — *Recommended*
   - Create `src/common/cache/` with a `CacheService` that exposes a clean interface:
     ```typescript
     interface CacheService {
       get<T>(key: string): Promise<T | undefined>;
       set(key: string, value: unknown, ttl?: number): Promise<void>;
       del(key: string): Promise<void>;
       reset(): Promise<void>;
     }
     ```
   - In-memory implementation: `Map<string, { value: unknown; expiry: number }>` with lazy TTL eviction — zero extra deps
   - Redis implementation: uses `ioredis` (optional peer dep, loaded at runtime only if `REDIS_URL` is set)
   - Factory provider checks `REDIS_URL` env var: present → Redis, absent → in-memory
   - If Redis connection fails, fall back to in-memory with a `logger.warn()`
   - Environment validation: add `@IsOptional() REDIS_URL: string` to `env.validation.ts`
   - Test: `CacheService` interface is trivial to mock; in-memory impl works in CI without any setup
   - **Dependencies added**: none for in-memory mode; `ioredis` is documented as optional (installed only when Redis is needed)
   - **Effort**: **Low**
   - Total code changes: ~5 files (module + service + spec + env validation + .env.example)

2. **`@nestjs/cache-manager` with factory-based store selection**
   - Install `@nestjs/cache-manager` + `cache-manager` as core deps
   - Register `CacheModule.registerAsync()` in `AppModule` with a factory:
     - If `REDIS_URL` present → Redis store (`cache-manager-ioredis` or `@keyv/redis`)
     - Otherwise → in-memory (default, no extra dep)
   - Expose `CacheService` wrapping `@nestjs/cache-manager`'s `Cache` instance for a clean typed API
   - Redis store becomes optional (peer/optional dep)
   - Decorators like `@CacheTTL()` and `@UseInterceptors(CacheInterceptor)` become available for template consumers
   - **Dependencies added**: `@nestjs/cache-manager` + `cache-manager` (always); `cache-manager-ioredis` optional
   - **Effort**: **Low-Medium**
   - Total code changes: ~6 files

3. **Only in-memory cache (no Redis support)**
   - Simplest: `Map<string, { value: unknown; expiry: number }>` in a service
   - No optional Redis path at all
   - Easy to implement, test, and understand
   - **Dependencies added**: none
   - **Effort**: **Very Low**
   - Con: Not future-proof; template consumers who need Redis later must rewrite the cache layer entirely

### Recommendation

**Approach 1: Custom CacheService with environment-driven backend.**

Rationale:
- This is a **template project** — consumers start from zero and need clarity, not magic. A custom `CacheService` with a clean interface is self-documenting and easy to mock.
- **True zero-dep in-memory mode**: The template installs cleanly without any cache-related packages. `ioredis` is documented as "install this if you want Redis" — not smuggled in as an optional peer dep that consumers didn't ask for.
- **Explicit fallback**: The `REDIS_URL` → Redis, absent → in-memory logic lives in one factory function. Failures log a clear warning and degrade gracefully. No hidden exceptions from missing optional deps.
- **Test simplicity**: `CacheService` is an interface. Mock it in unit tests with `useValue`. The in-memory implementation is trivial to test in isolation. No `CacheModule.registerAsync()` config needed in test modules — just the service mock.
- **CI compatibility**: CI has no Redis. With in-memory default, tests just work. If someone adds Redis, they also add a Redis service to CI.
- **Upgrade path**: Template consumers who later want `@nestjs/cache-manager` decorators (`@CacheTTL()`, `@CacheInterceptor`) can swap the internal implementation without changing any consumer code — the `CacheService` interface stays the same.
- **Aligned with project patterns**: The same `useFactory` + `@Optional()` pattern already used for `ExampleMicroservice` in `AppService` and `MicroserviceFactory`.

Why not Approach 2 (`@nestjs/cache-manager`):
- `@nestjs/cache-manager` adds a dependency even when Redis is not needed (the template has no use case that demands decorator-based caching yet)
- The store selection API (`cache-manager` v5 uses Keyv-based stores) adds indirection that template consumers don't benefit from
- Test setup becomes more complex (need `CacheModule.register` in every test module that uses cache, or mock the `Cache` token)
- The decorator/interceptor API is powerful but premature — template consumers should add it when they actually need it

### Module Structure Proposal

```
src/common/cache/
├── cache.module.ts      # Global module, registers CacheService
├── cache.service.ts     # Public API: get<T>, set, del, reset
├── cache.service.spec.ts # Tests for in-memory mode
├── stores/
│   ├── in-memory.store.ts    # Map-based store with TTL
│   ├── redis.store.ts        # ioredis-backed store (loaded conditionally)
│   └── store.interface.ts    # IStore interface
```

### Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Adding `REDIS_URL` to env validation is non-breaking | None | Field is `@IsOptional()` |
| In-memory cache doesn't survive restarts | Expected | Documented behavior — Redis is for persistence/distributed mode |
| Template consumer needs `@CacheTTL()` decorators later | Medium | Interface allows swapping to `@nestjs/cache-manager` behind the scenes without breaking consumers |
| Redis connection failure in production | Low | Factory wraps Redis connection in try/catch, logs warning, falls back to in-memory |
| Test isolation (cache state leaking between tests) | Low | `CacheService.reset()` called in `afterEach` or per-test module scope |

### Ready for Proposal

**Yes** — the scope is clear, the approach is aligned with the template's goals (simplicity, optional deps, explicit patterns), and the implementation path is well understood. The recommendation (custom CacheService with in-memory default and optional Redis via `ioredis`) is the most maintainable choice for a template project that consumers will fork.

One open question for the Proposal phase: should the `CacheModule` be a `Global` module registered once in `AppModule`, or should it be imported per-feature? For a template, **Global** makes more sense since caching is a cross-cutting concern and every service may need it.
