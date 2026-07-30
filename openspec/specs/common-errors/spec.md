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

### Requirement: CommonError Status Code Validation

The system MUST validate that the status code provided to GenericError is a valid HTTP status number.

The GenericError constructor SHALL validate that status is a number between 100 and 599.

#### Scenario: Valid Status Code Accepted

- GIVEN GenericError constructor with status parameter
- WHEN GenericError(e?: unknown, status?: number) is called with valid status
- THEN no validation error occurs
- AND the status is stored correctly

#### Scenario: Invalid Status Code Rejected

- GIVEN GenericError constructor with invalid status
- WHEN GenericError(e?: unknown, status?: number) is called with invalid status
- THEN a TypeError is thrown
- AND the error is not created
