# Specification for parameter-store

## Purpose

Registry-backed runtime configuration store with environment overrides, Redis persistence via ICACHE_SERVICE, and parameter changed events for live consumers. Eliminates hardcoded configuration values in favor of a centralized, versioned registry.

## Requirements

### Requirement: Parameter Registry with Compile-time Definitions

The system MUST maintain a compile-time registry of parameter definitions containing name, group, type, default value, and optional validation.

#### Scenario: Parameter Definition Registration

- GIVEN a parameter definition is created during module initialization
- WHEN ParameterModule is imported and initialized
- THEN the definition is available in the registry with all specified properties
- AND the parameter can be accessed via ParameterService

### Requirement: Parameter Store with Priority Resolution

The system MUST provide a store with L1 in-memory cache, environment variable overrides, and Redis backend via ICACHE_SERVICE with prefix `param:`.

#### Scenario: Parameter Store Resolution Priority

- GIVEN a parameter is requested
- WHEN the store is queried
- THEN the value follows priority: L1 cache → env override → Redis → default
- AND the parameter name is used as cache key with `param:` prefix

### Requirement: Parameter Service CRUD Operations

The system MUST expose a ParameterService with get, set, getAll, getByGroup, has, and delete operations.

#### Scenario: Parameter Service Get Operation

- GIVEN a parameter key exists in the registry
- WHEN ParameterService.get(key) is called
- THEN the parameter value is returned according to priority resolution
- AND the result matches the expected type from registry definition

#### Scenario: Parameter Service Set Operation

- GIVEN a parameter key and value are provided
- WHEN ParameterService.set(key, value) is called
- THEN the value is validated against registry definition
- AND the value is written to Redis (via ICACHE_SERVICE) and L1 cache is invalidated
- AND a `parameter.changed` event is emitted via EventEmitter2

### Requirement: Parameter Decorator for Dependency Injection

The system MUST provide a @Parameter(key, { strict? }) decorator that extracts parameter values from ParameterService instance.

#### Scenario: Parameter Decorator Usage

- GIVEN a service needs a configuration parameter
- WHEN @Parameter('ENTITY_CACHE_TTL_MS') is used on a constructor parameter
- THEN the parameter value is injected at runtime
- AND the decorator uses the static ParameterService.instance for value extraction

### Requirement: Graceful Degradation Without Redis

The system MUST gracefully degrade when Redis is unavailable, falling back to in-memory and environment values.

#### Scenario: Redis Unavailable Fallback

- GIVEN Redis is not available (no REDIS_URL)
- WHEN ParameterService.set() is called
- THEN the value is written to L1 and env override only
- AND no error is thrown to the caller
- AND subsequent ParameterService.get() falls back to L1 + env + default

### Requirement: Event-Driven Change Notifications

The system MUST emit `parameter.changed` events whenever parameters are successfully modified.

#### Scenario: Event Emission on Set

- GIVEN ParameterService.set() is called successfully
- WHEN the operation completes
- THEN a `parameter.changed` event is emitted with payload containing key and new value
- AND EventEmitter2 is used for event publication
- AND event subscribers can react to the change