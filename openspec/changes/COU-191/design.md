# Design: COU-191 — Cache Service with optional Redis

## Technical Approach

Implement a pluggable cache service using an interface-driven architecture. The `CacheModule.forRoot()` dynamic module reads the environment at bootstrap and registers either `InMemoryCacheProvider` (default, zero deps) or `RedisCacheProvider` (when `REDIS_URL` is set). Consumers inject `ICacheService` token — completely decoupled from the backend.

## Architecture Decisions

### Decision: Interface Token Strategy

**Choice**: Use a string token `ICACHE_SERVICE` for DI instead of the interface directly
**Alternatives considered**: Use `ICacheService` interface as token
**Rationale**: TypeScript interfaces disappear at runtime. A string token ensures the provider can be resolved by consumers without import cycles. This is the standard NestJS pattern for interface-based DI.

### Decision: TTL Storage Strategy

**Choice**: Store `expiresAt` timestamp per entry in both providers
**Alternatives considered**: Use Redis native TTL (EX), separate cleanup interval
**Rationale**: Unified approach simplifies logic. In-memory uses lazy expiration on `get` + periodic sweep. Redis uses native TTL for efficiency but tracks `expiresAt` locally for consistency checks. Both share the same internal model: `{ value: T; expiresAt: number }`.

### Decision: Redis Failure Handling

**Choice**: Graceful degradation — log error, return `null` on `get`, no-op on `set/del`
**Alternatives considered**: Throw on Redis failure, fallback to in-memory automatically
**Rationale**: Fail-open preserves availability. Throwing would cascade failures. Auto-fallback adds complexity and state sync issues. Consumers can implement their own fallback if needed. Documented behavior allows informed decisions.

### Decision: Optional ioredis Dependency

**Choice**: Add `ioredis` to `dependencies` (not `devDependencies`) with `optional: true` in package.json
**Alternatives considered**: Peer dependency, dev dependency, runtime require
**Rationale**: Template users get it by default when they enable Redis. `optional: true` allows npm to skip install if not needed. Runtime require adds complexity and hides missing dep errors.

### Decision: Provider Selection Timing

**Choice**: Selection at `CacheModule.forRoot()` bootstrap via `ConfigService`
**Alternatives considered**: Factory provider with runtime check per request
**Rationale**: Single decision at startup is simpler, performant, and predictable. Runtime switching would require locking and state migration — overkill for a template.

## Data Flow

```text
Consumer (e.g., EntityService)
    │
    ▼ injects ICACHE_SERVICE token
┌─────────────────────────────────┐
│      CacheModule.forRoot()      │
│  ┌───────────────────────────┐  │
│  │ ConfigService.get('REDIS_URL')  │
│  └─────────────┬─────────────┘  │
│        │                    │   │
│    exists                 missing
│        ▼                    ▼
┌───────────────┐    ┌─────────────────┐
│RedisCacheProvider│  │InMemoryCacheProvider│
│  (ioredis)    │    │   (Map)         │
└───────┬───────┘    └────────┬────────┘
        │                     │
        └──────────┬──────────┘
                   ▼
          ICacheService interface
          (get<T>, set, del, reset)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `ioredis` as optional dependency |
| `src/common/cache/cache.module.ts` | Create | Dynamic module with `forRoot()` registering selected provider |
| `src/common/cache/cache.service.ts` | Create | `ICacheService` interface, `InMemoryCacheProvider`, `RedisCacheProvider` |
| `src/common/cache/cache.service.spec.ts` | Create | Unit tests for both providers + integration-style tests |
| `src/config/env.validation.ts` | Modify | Add optional `REDIS_URL` field with `@IsOptional()` |
| `.env.example` | Modify | Add commented `# REDIS_URL=redis://localhost:6379` |
| `docker-compose.yml` | Modify | Add commented Redis service definition (documented only) |
| `src/entity/service/entity.service.ts` | Modify (optional) | Demonstrate caching in `findById`/`findAll` |

## Interfaces / Contracts

```typescript
// src/common/cache/cache.service.ts

export const ICACHE_SERVICE = 'ICACHE_SERVICE';

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  reset(): Promise<void>;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number; // epoch ms
}

export interface CacheOptions {
  defaultTtlMs?: number;
}
```

**InMemoryCacheProvider**:
```typescript
@Injectable()
export class InMemoryCacheProvider implements ICacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(@Inject(CACHE_OPTIONS) options: CacheOptions = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? 60_000; // 1 min default
    this.startCleanupInterval();
  }

  async get<T>(key: string): Promise<T | null> { ... }
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> { ... }
  async del(key: string): Promise<void> { ... }
  async reset(): Promise<void> { ... }
  onModuleDestroy(): void { ... }
}
```

**RedisCacheProvider**:
```typescript
@Injectable()
export class RedisCacheProvider implements ICacheService {
  private readonly client: Redis;
  private readonly defaultTtlMs: number;
  private readonly keyPrefix = 'cache:';

  constructor(
    @Inject(CACHE_OPTIONS) options: CacheOptions = {},
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.defaultTtlMs = options.defaultTtlMs ?? 60_000;
    this.client = new Redis(config.getOrThrow('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // fail fast
    });
    this.client.connect().catch(() => {}); // fire-and-forget
  }

  async get<T>(key: string): Promise<T | null> { ... }
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> { ... }
  async del(key: string): Promise<void> { ... }
  async reset(): Promise<void> { ... }
  onModuleDestroy(): Promise<void> { ... }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit: InMemoryCacheProvider | get/set/del/reset, TTL expiration, concurrent access, cleanup interval | Pure Jest mocks, fake timers (`jest.useFakeTimers`) for TTL |
| Unit: RedisCacheProvider | get/set/del/reset, serialization, connection failure handling | Mock `ioredis` client methods, test error paths |
| Unit: CacheModule.forRoot() | Provider selection logic (REDIS_URL present/absent) | `ConfigService` mock with/without `REDIS_URL` |
| Integration | EntityService using ICacheService for `findById`/`findAll` | Test module with real InMemoryCacheProvider, verify cache hit/miss |

**Redis integration test**: Optional, marked with `// @requires-redis` comment. Runs only when `REDIS_URL` is set in CI environment.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. New module is additive. Existing services opt-in by injecting `ICACHE_SERVICE`.

**Rollback**: Single commit revert. If Redis was enabled, also remove `ioredis` from `package.json` and `REDIS_URL` from env validation.

## Open Questions

- [ ] Should `defaultTtlMs` be configurable via env (`CACHE_DEFAULT_TTL_MS`) in addition to module options?
- [ ] Is the 1-minute default TTL appropriate for the template's use cases, or should it be longer (e.g., 5 min)?
- [ ] Should `reset()` support pattern-based deletion (e.g., `reset('user:*')`) — currently out of scope per proposal?

---

**Size**: ~750 words