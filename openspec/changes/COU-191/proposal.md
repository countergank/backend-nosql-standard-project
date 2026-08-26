# Proposal: Cache Service with optional Redis (COU-191)

## Business Problem

A backend template project should provide caching out of the box without mandating a specific infrastructure. Services like `EntityService` make redundant calls to MongoDB for frequently accessed data (e.g., `findById`, `findAll`). Adding an optional cache layer reduces latency and database load while keeping the template zero-dep for minimal setups.

## Proposed Solution

Custom `CacheService` with an interface-driven architecture:

- **Interface**: `ICacheService` — `get<T>`, `set`, `del`, `reset`
- **Default implementation**: `InMemoryCacheProvider` — Map-based with TTL, zero external dependencies
- **Optional implementation**: `RedisCacheProvider` — via `ioredis` when `REDIS_URL` is set

The service auto-selects the provider at bootstrap based on environment configuration. No code changes needed in consumers when switching between in-memory and Redis.

## Scope

### In scope

- `ICacheService` interface with typed `get<T>`, `set`, `del`, `reset`
- `InMemoryCacheProvider` — Map-based, configurable TTL per entry
- `RedisCacheProvider` — ioredis-backed, enabled when `REDIS_URL` is present
- `CacheModule` — dynamic module registering the correct provider
- Environment-driven auto-select (`REDIS_URL` → Redis, otherwise in-memory)
- Optional `REDIS_URL` validation in `env.validation.ts`
- Test suite: unit tests for both providers + integration with consumer

### Out of scope

- Decorator-based caching (`@UseInterceptors(CacheInterceptor)`, `@CacheTTL`)
- Cache invalidation patterns (tag-based, pattern-based)
- Distributed cache topologies (cluster, sentinel)
- Redis service in `docker-compose.yml` (documented but not added — optional infra)
- Cache statistics / monitoring

## Architecture

```
CacheModule.forRoot()
  │
  ├── ICacheService (interface)
  │
  ├── InMemoryCacheProvider (default)
  │     └── Map<string, { value: T; expiresAt: number }>
  │
  └── RedisCacheProvider (when REDIS_URL is set)
        └── ioredis (optional dependency)
```

The `CacheModule` reads the environment and registers the appropriate provider. Consumers inject `ICacheService` via the token — they never know which backend is active.

## Affected Areas

| Area | Change |
|------|--------|
| `package.json` | + optional `ioredis` dep |
| `src/common/cache/cache.module.ts` | NEW — dynamic module |
| `src/common/cache/cache.service.ts` | NEW — interface + providers |
| `src/common/cache/cache.service.spec.ts` | NEW — tests |
| `src/config/env.validation.ts` | + optional `REDIS_URL` |
| `.env.example` | + `# REDIS_URL=redis://localhost:6379` |
| `src/entity/service/entity.service.ts` | Optional — add caching to `findById`/`findAll` |
| `docker-compose.yml` | Add commented Redis service (documented only) |

## Rollback

Single commit revert. If Redis is added, also remove `ioredis` from `package.json` and the `REDIS_URL` env var.
