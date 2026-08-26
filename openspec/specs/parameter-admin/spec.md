# Specification for parameter-admin

## Purpose

Admin API for managing runtime configuration parameters with proper authorization and error handling. Provides secure endpoints for administrators to view and modify configuration values.

## Requirements

### Requirement: Versioned Admin Controller

The system MUST provide a versioned admin controller at `/v1/admin/parameters` with GET and PUT endpoints.

#### Scenario: Admin Controller Route Registration

- GIVEN ParameterAdminModule is imported
- WHEN the module is bootstrapped
- THEN routes are registered under `/v1/admin/parameters`
- AND versioning is enabled with URI-based version path

### Requirement: Admin ApiKeyGuard Protection

The system MUST protect all admin endpoints using AdminApiKeyGuard that checks `x-admin-token` header against `ADMIN_API_TOKEN` environment variable.

#### Scenario: Unauthorized Access Attempt

- GIVEN a request to `/v1/admin/parameters` without authentication
- WHEN the request is made
- THEN a 401 Unauthorized response is returned
- AND the response includes WWW-Authenticate header
- AND the request is not processed further

#### Scenario: Authorized Access with Valid Token

- GIVEN a request with valid `x-admin-token` header
- WHEN the request is made to `/v1/admin/parameters`
- THEN the request proceeds to the controller logic
- AND a 200 OK response is returned for successful operations

### Requirement: GET All Parameters Endpoint

The system MUST provide a GET `/` endpoint that returns all parameter values.

#### Scenario: Retrieve All Parameters

- GIVEN a valid admin token is provided
- WHEN GET `/v1/admin/parameters` is called
- THEN all parameter values are returned
- AND the response includes parameter name, value, type, group, and description
- AND the response status is 200 OK

### Requirement: GET Parameters by Group Endpoint

The system MUST provide a GET `/:group` endpoint that returns parameters filtered by group.

#### Scenario: Retrieve Parameters by Group

- GIVEN a valid admin token and group name
- WHEN GET `/v1/admin/parameters/cache` is called
- THEN only parameters in the specified group are returned
- AND the response includes parameter metadata
- AND the response status is 200 OK

### Requirement: PUT Parameter Update Endpoint

The system MUST provide a PUT `/:key` endpoint to update parameter values with comprehensive error handling.

#### Scenario: Successful Parameter Update

- GIVEN a valid admin token and existing parameter key
- WHEN PUT `/v1/admin/parameters/ENTITY_CACHE_TTL_MS` with new value is called
- THEN the parameter value is updated in the store
- AND the parameter changed event is emitted
- AND a 200 OK response is returned

#### Scenario: Parameter Not Found Error

- GIVEN a valid admin token and non-existent parameter key
- WHEN PUT `/v1/admin/parameters/NONEXISTENT_KEY` is called
- THEN a 404 Not Found response is returned
- AND the response includes PARAMETER_NOT_FOUND error kind
- AND the error code is 'PARAMETER_NOT_FOUND'

#### Scenario: Environment Override Error

- GIVEN a valid admin token and parameter that is environment-bound
- WHEN PUT `/v1/admin/parameters/ENTITY_CACHE_TTL_MS` is called when bound to env
- THEN a 409 Conflict response is returned
- AND the response includes PARAMETER_ENV_OVERRIDDEN error kind
- AND the error code is 'PARAMETER_ENV_OVERRIDDEN'

#### Scenario: Invalid Value Error

- GIVEN a valid admin token and parameter with type validation
- WHEN PUT `/v1/admin/parameters/ENTITY_CACHE_TTL_MS` with invalid value (non-number) is called
- THEN a 422 Unprocessable Entity response is returned
- AND the response includes PARAMETER_INVALID_VALUE error kind
- AND the error code is 'PARAMETER_INVALID_VALUE'