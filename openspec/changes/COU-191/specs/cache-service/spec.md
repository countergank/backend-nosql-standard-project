# Cache Service Specification

## Purpose

Provide a flexible caching service with pluggable backends. The cache service offers TypeScript-typed operations through an interface-driven architecture, supporting both an in-memory implementation (zero dependencies) and an optional Redis implementation. This enables caching for frequently accessed data like entity queries while maintaining backward compatibility and performance.

## Requirements

### Requirement: ICacheService interface

The system MUST provide a `ICacheService` interface with typed `get<T>`, `set`, `del`, and `reset` methods. The interface SHALL define the cache contract used by all consumers, ensuring consistent behavior across different cache implementations.

#### Scenario: Interface definition

- GIVEN a cache service interface
- WHEN defining the ICacheService contract
- THEN the system provides get<T>, set, del, and reset methods

### Requirement: InMemoryCacheProvider implementation

The system MUST implement `InMemoryCacheProvider` as the default cache using Map-based storage with configurable TTL per entry. The implementation SHOULD provide thread-safe operations for Node.js environment and MUST automatically clean up expired entries.

#### Scenario: InMemoryCacheProvider happy path

- GIVEN an in-memory cache provider with TTL configuration
- WHEN setting and getting values
- THEN values are stored and retrieved correctly within TTL window

#### Scenario: InMemoryCacheProvider TTL expiration

- GIVEN a cached value with TTL
- WHEN waiting for expiration
- THEN the value becomes unavailable after TTL

### Requirement: RedisCacheProvider implementation

The system MUST optionally implement `RedisCacheProvider` using `ioredis` when `REDIS_URL` environment variable is present. This implementation SHALL provide Redis-specific storage benefits including persistence and distributed capabilities.

#### Scenario: RedisCacheProvider happy path

- GIVEN a Redis provider with valid REDIS_URL
- WHEN setting and getting values
- THEN values are stored and retrieved from Redis

#### Scenario: Redis unavailable fallback

- GIVEN RedisCacheProvider is active but Redis is unavailable
- WHEN attempting cache operations
- THEN the system gracefully handles connection failures

### Requirement: Auto-provider selection

The system MUST auto-select cache provider based on `REDIS_URL` environment variable. When `REDIS_URL` is present, use `RedisCacheProvider`; otherwise default to `InMemoryCacheProvider`. This selection SHOULD happen at module bootstrap.

#### Scenario: Auto-provider selection based on REDIS_URL

- GIVEN CacheModule initialization
- WHEN reading environment configuration
- THEN the system selects appropriate provider

### Requirement: TTL handling

The system MUST support TTL defaults and overrides per cache entry. Individual entries can have custom TTL values while providing sensible defaults. The implementation SHALL automatically manage TTL expiration across both providers.

#### Scenario: TTL default and override behavior

- GIVEN a cache service with TTL support
- WHEN setting values with and without explicit TTL
- THEN entries respect both default and custom TTL settings

### Requirement: Thread safety

The system MUST ensure thread-safe cache operations. While Node.js is single-threaded by nature, the implementation SHOULD be designed to handle concurrent access patterns safely.

#### Scenario: Concurrent cache access

- GIVEN multiple simultaneous cache operations
- WHEN accessing cache concurrently
- THEN operations complete correctly without race conditions

## Scope

- ICacheService interface with typed generics
- InMemoryCacheProvider implementation (Map-based, TTL support)
- RedisCacheProvider implementation (ioredis-backed, optional)
- Dynamic CacheModule selection based on environment
- TTL configuration and expiration management
- Environment-driven auto-selection mechanism

## Reset behavior

The system SHALL provide a reset operation to clear all cached entries. This operation applies to the current provider and SHALL work across both in-memory and Redis implementations.

#### Scenario: Reset operation

- GIVEN a cache provider with stored entries
- WHEN calling reset
- THEN all cached entries are removed from the active provider

## Files

- `src/common/cache/cache.module.ts` — Dynamic module registering cache provider
- `src/common/cache/cache.service.ts` — Interface and provider implementations
- `src/common/cache/cache.service.spec.ts` — Test suite for all cache functionality
- `src/config/env.validation.ts` — Optional REDIS_URL environment validation

The implementation supports optional Redis via `ioredis` dependency when environment configuration indicates. This enables zero-dependency baseline with optional scaling capabilities.