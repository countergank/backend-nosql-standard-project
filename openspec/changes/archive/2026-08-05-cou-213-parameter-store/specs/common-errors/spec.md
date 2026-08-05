# Delta for common-errors

## MODIFIED Requirements

### Requirement: GenericError Enhanced with HTTP Status Code

The `GenericError` class MUST accept an optional `status?: number` parameter.

When provided, the status should be stored and included in the public error representation.
When not provided, the default status should be `HttpStatus.INTERNAL_SERVER_ERROR` (500).

(Previously: GenericError had no HTTP status mapping, only message and code)

#### Scenario: GenericError Default Status

- GIVEN a GenericError is instantiated without status parameter
- WHEN GenericError(e?: unknown) constructor is called
- THEN getErrorPublic() returns statusCode of 500
- AND the error code remains unchanged

#### Scenario: GenericError Custom Status

- GIVEN a GenericError is instantiated with status parameter
- WHEN GenericError(e?: unknown, status?: number) constructor is called
- THEN getErrorPublic() returns statusCode of the provided value
- AND the error code remains unchanged

## ADDED Requirements

### Requirement: Parameter Not Found Error Kind

The system MUST add PARAMETER_NOT_FOUND error kind to the ErrorKind registry with status code 404.

#### Scenario: PARAMETER_NOT_FOUND Error Creation

- GIVEN DomainError.fromKind('PARAMETER_NOT_FOUND') is called
- WHEN the error is created
- THEN the error has statusCode of 404
- AND the error kind is 'PARAMETER_NOT_FOUND'

### Requirement: Parameter Environment Override Error Kind

The system MUST add PARAMETER_ENV_OVERRIDDEN error kind to the ErrorKind registry with status code 409.

#### Scenario: PARAMETER_ENV_OVERRIDDEN Error Creation

- GIVEN DomainError.fromKind('PARAMETER_ENV_OVERRIDDEN') is called
- WHEN the error is created
- THEN the error has statusCode of 409
- AND the error kind is 'PARAMETER_ENV_OVERRIDDEN'

### Requirement: Parameter Invalid Value Error Kind

The system MUST add PARAMETER_INVALID_VALUE error kind to the ErrorKind registry with status code 422.

#### Scenario: PARAMETER_INVALID_VALUE Error Creation

- GIVEN DomainError.fromKind('PARAMETER_INVALID_VALUE') is called
- WHEN the error is created
- THEN the error has statusCode of 422
- AND the error kind is 'PARAMETER_INVALID_VALUE'

## REMOVED Requirements

### Requirement: GenericError Status Code Validation

(Reason: Replaced with new Parameter-specific error kinds for better error categorization)
(Migration: None - breaking change, clients should adapt to new error kinds)

## RENAMED Requirements

### Requirement: CommonError Status Code Validation → Parameter Invalid Value Validation

(Reason: Renamed for clarity and to reflect specific parameter validation use case)
(Migration: Clients should update error handling to check for PARAMETER_INVALID_VALUE instead of generic CommonError)