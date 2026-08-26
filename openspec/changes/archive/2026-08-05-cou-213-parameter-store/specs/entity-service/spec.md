# Specification for entity-service

## Purpose

EntityService modified to consume ENTITY_CACHE_TTL_MS from the Parameter Store via @Parameter() decorator, enabling runtime configuration changes without application restart. Ensures cache TTL can be modified through admin endpoints for dynamic configuration management.

## Requirements

### Requirement: EntityService Parameter Dependency Injection

The system MUST have EntityService inject the ENTITY_CACHE_TTL_MS parameter via @Parameter() decorator instead of using a hardcoded value.

#### Scenario: EntityService Parameter Injection

- GIVEN EntityService is instantiated
- WHEN EntityService constructor is called
- THEN the ENTITY_CACHE_TTL_MS parameter is injected via @Parameter() decorator
- AND the parameter value is stored in cacheTtlMs property
- AND the value can be updated at runtime via admin endpoints

### Requirement: Cache TTL Runtime Configuration

The system MUST update EntityService cache TTL without restart when the ENTITY_CACHE_TTL_MS parameter is modified via admin endpoint.

#### Scenario: Runtime Cache TTL Update

- GIVEN ENTITY_CACHE_TTL_MS parameter is updated via PUT /v1/admin/parameters/ENTITY_CACHE_TTL_MS
- WHEN EntityService cache operations are performed
- THEN the new cache TTL value is used for all subsequent cache operations
- AND existing cache entries may use old TTL (depending on implementation)
- AND cache behavior updates automatically without service restart

### Requirement: Graceful Cache TTL Validation

The system MUST validate ENTITY_CACHE_TTL_MS parameter value and handle invalid values appropriately.

#### Scenario: Valid Cache TTL Update

- GIVEN a valid positive number (e.g., 60000) for ENTITY_CACHE_TTL_MS
- WHEN PUT /v1/admin/parameters/ENTITY_CACHE_TTL_MS is called
- THEN the parameter is accepted and EntityService uses new TTL value
- AND cache operations reflect the updated duration

#### Scenario: Invalid Cache TTL Rejection

- GIVEN an invalid value (e.g., negative number, non-number) for ENTITY_CACHE_TTL_MS
- WHEN PUT /v1/admin/parameters/ENTITY_CACHE_TTL_MS is called
- THEN ParameterInvalidValue error is returned (422)
- AND EntityService cache TTL remains unchanged
- AND no runtime cache behavior change occurs

### Requirement: Backward Compatibility for Cache Operations

The system MUST maintain backward compatibility for all existing EntityService cache operations while using parameter values.

#### Scenario: Existing Cache Operations Unchanged

- GIVEN EntityService methods like findAll(), findById()
- WHEN they are called before parameter modification
- THEN cache behavior remains consistent with documented TTL
- AND all existing functionality continues to work
- AND no breaking changes to public API are introduced

### Requirement: Parameter Service Consumer Pattern

The system MUST demonstrate proper consumption of ParameterService through the @Parameter() decorator pattern.

#### Scenario: Parameter Decorator Pattern Usage

- GIVEN EntityService needs configuration parameter
- WHEN @Parameter('ENTITY_CACHE_TTL_MS') is used on constructor parameter
- THEN the parameter value is extracted from ParameterService.instance
- AND the value is accessible for caching configuration
- AND the pattern can be reused for other EntityService parameters