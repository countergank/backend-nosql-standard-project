# Delta for entity-errors

## MODIFIED Requirements

### Requirement: EntityError Base with HTTP Status

The `EntityError` base class MUST accept an optional `status?: number` parameter.

(Previously: EntityError hierarchy had no HTTP status mapping)

#### Scenario: EntityError Status Code Support

- GIVEN an EntityError is instantiated with status parameter
- WHEN EntityError(e?: unknown, status?: number) constructor is called
- THEN getErrorPublic() includes the provided statusCode
- AND the error code remains unchanged

## MODIFIED Requirements

### Requirement: EntityNotFoundError Default Status

The `EntityNotFoundError` class MUST have a default status code of `HttpStatus.NOT_FOUND` (404).

(Previously: EntityNotFoundError had no HTTP status mapping)

#### Scenario: EntityNotFoundError Default Status

- GIVEN EntityNotFoundError is instantiated
- WHEN EntityNotFoundError(e?: unknown) constructor is called

- THEN getErrorPublic() returns statusCode of 404
- AND the error code is preserved

## MODIFIED Requirements

### Requirement: EntityNameAlreadyExistsError Default Status

The `EntityNameAlreadyExistsError` class MUST have a default status code of `HttpStatus.CONFLICT` (409).

(Previously: EntityNameAlreadyExistsError had no HTTP status mapping)

#### Scenario: EntityNameAlreadyExistsError Default Status

- GIVEN EntityNameAlreadyExistsError is instantiated
- WHEN EntityNameAlreadyExistsError(e?: unknown) constructor is called
- THEN getErrorPublic() returns statusCode of 409
- AND the error code is preserved

## MODIFIED Requirements

### Requirement: EntityEmailAlreadyExistsError Default Status

The `EntityEmailAlreadyExistsError` class MUST have a default status code of `HttpStatus.CONFLICT` (409).

(Previously: EntityEmailAlreadyExistsError had no HTTP status mapping)

#### Scenario: EntityEmailAlreadyExistsError Default Status

- GIVEN EntityEmailAlreadyExistsError is instantiated
- WHEN EntityEmailAlreadyExistsError(e?: unknown) constructor is called
- THEN getErrorPublic() returns statusCode of 409
- AND the error code is preserved

## MODIFIED Requirements

### Requirement: EntityPopulateError Default Status

The `EntityPopulateError` class MUST have a default status code of `HttpStatus.BAD_REQUEST` (400).

(Previously: EntityPopulateError had no HTTP status mapping)

#### Scenario: EntityPopulateError Default Status

- GIVEN EntityPopulateError is instantiated
- WHEN EntityPopulateError(e?: unknown) constructor is called
- THEN getErrorPublic() returns statusCode of 400
- AND the error code is preserved

## ADDED Requirements

### Requirement: EntityError Status Code Validation

The system MUST validate that the status code provided to EntityError subclasses is a valid HTTP status number.

The EntityError constructor SHALL validate that status is a number between 100 and 599.

#### Scenario: Valid EntityError Status Code

- GIVEN EntityError constructor with status parameter
- WHEN EntityError(e?: unknown, status?: number) is called with valid status
- THEN no validation error occurs
- AND the status is stored correctly

#### Scenario: Invalid EntityError Status Code

- GIVEN EntityError constructor with invalid status
- WHEN EntityError(e?: unknown, status?: number) is called with invalid status
- THEN a TypeError is thrown
- AND the error is not created
