# Delta for cache-module

## MODIFIED Requirements

### Requirement: ICACHE_SERVICE TTL Unit in Parameter Store

The system MUST use ms/PX TTL directly with ICACHE_SERVICE for Redis parameter storage (no conversion to seconds/EX).

(Previously: ICACHE_SERVICE TTL conversion ms→s for Redis EX was proposed)

#### Scenario: Redis Store with ms/PX TTL

- GIVEN a parameter set via ParameterService with TTL in ms (e.g., 30000)
- WHEN the parameter is written to Redis via ICACHE_SERVICE
- THEN the TTL is passed directly as milliseconds to ICACHE_SERVICE.set(key, value, ttlMs)
- AND the Redis key uses PX (milliseconds) expiration with the original TTL value
- AND no conversion from ms to s occurs

#### Scenario: In-Memory Fallback Without Redis

- GIVEN no REDIS_URL configured (only in-memory provider)
- WHEN a parameter is set with TTL in ms
- THEN the TTL is used directly by the in-memory cache provider
- AND the parameter remains in L1 cache without external persistence

## ADDED Requirements

### Requirement: Parameter Store TTL Unit Handling

The system MUST use consistent ms/PX TTL units across all cache providers in ParameterStore.

#### Scenario: Parameter Store TTL Processing

- GIVEN a parameter value with TTL in ms from ParameterService.set()
- WHEN the parameter is written to Redis
- THEN the TTL is passed as milliseconds to ICACHE_SERVICE (PX command)
- AND the in-memory provider uses ms directly for TTL
- AND graceful degradation occurs when Redis is unavailable

## RENAMED Requirements

### Requirement: Cache Service TTL Specification → Parameter Store TTL Unit Consistency

(Reason: Better reflects parameter store-specific TTL unit requirements — no conversion needed)
(Migration: Existing cache module functionality remains unchanged; parameter store aligns to ICACHE_SERVICE ms/PX contract)