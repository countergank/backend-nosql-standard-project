# Tasks: Cache Service with optional Redis (COU-191)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1200 lines (5 new files, 3 modified) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Infrastructure + Interface + InMemoryCacheProvider (450 lines) → PR 2: RedisCacheProvider + Module + Env config (450 lines) → PR 3: Tests + Integration (300 lines) |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Create cache directory structure + ICacheService interface | PR 1 | `npm test -- src/common/cache/cache.service.spec.ts -i "interface"` | Manually validate DI injection | Files src/common/cache/ |
| 2 | Implement InMemoryCacheProvider with TTL and cleanup | PR 1 | `npm test -- src/common/cache/ -t "InMemoryCacheProvider"` | Jest fake timers test | CacheModule + InMemory provider |
| 3 | Add optional ioredis dependency to package.json | PR 2 | `npm test -- src/common/cache/ -t "RedisCacheProvider"` | Test against a test Redis instance | package.json + provider |
| 4 | Implement RedisCacheProvider with graceful failure handling | PR 2 | `npm test -- src/common/cache/cache.service.spec.ts -i "redis"` | Redis mock error scenarios | Redis provider + env config |
| 5 | Create CacheModule with environment-driven provider selection | PR 2 | `npm test -- src/common/cache/ -t "CacheModule"` | ConfigService mock (with/without REDIS_URL) | Module + provider logic |
| 6 | Add REDIS_URL env validation in env.validation.ts | PR 2 | `npm run validate-env` | ConfigService validation tests | env.validation.ts |
| 7 | Write comprehensive unit tests for both providers | PR 3 | `npm test src/common/cache/` | Manual validation of 100% test coverage | All test files |
| 8 | Demonstrate integration in EntityService | PR 3 | `npm test entity.service.spec.ts` | Manual execution with cache behavior | EntityService modified |

## Phase 1: Infrastructure / Foundation

- [x] 1.1 Create directory `src/common/cache/`
- [x] 1.2 Initialize `src/common/cache/cache.module.ts` with `forRoot()` method
- [x] 1.3 Initialize `src/common/cache/cache.service.ts` with `ICacheService` interface

## Phase 2: Core Implementation

- [x] 2.1 Implement `InMemoryCacheProvider` with Map storage, TTL, cleanup interval
- [x] 2.2 Add `InMemoryCacheProvider.onModuleDestroy()` for proper cleanup
- [x] 2.3 Implement `RedisCacheProvider` with ioredis integration
- [x] 2.4 Add graceful error handling for Redis failures in RedisCacheProvider
- [x] 2.5 Configure `ioredis` as optional dependency in `package.json`

## Phase 3: Integration / Wiring

- [x] 3.1 Implement provider selection logic in `CacheModule.forRoot()` based on `REDIS_URL`
- [x] 3.2 Update `env.validation.ts` with optional `REDIS_URL` field
- [x] 3.3 Update `.env.example` with Redis configuration
- [x] 3.4 Modify `CacheModule` to provide `ICACHE_SERVICE` token with correct provider
- [x] 3.5 Demonstrate caching integration in `EntityService.findById` and `findAll`

## Phase 4: Testing / Verification

- [x] 4.1 Write unit tests for `ICacheService` interface contract
- [x] 4.2 Write comprehensive tests for `InMemoryCacheProvider` (happy path, TTL, cleanup, concurrency)
- [x] 4.3 Write unit tests for `RedisCacheProvider` (happy path, error handling)
- [x] 4.4 Write tests for `CacheModule.forRoot()` provider selection logic
- [x] 4.5 Write integration tests for EntityService caching behavior
- [x] 4.6 Add `@requires-redis` marked tests for Redis integration tests
- [x] 4.7 Run full test suite build verification