# Delta for app-errors

## MODIFIED Requirements

### Requirement: AppError Enhanced with HTTP Status Code

The `AppError` class MUST accept an optional `status?: number` parameter.

(Previously: AppError had no HTTP status mapping)

#### Scenario: AppError Status Code Support

- GIVEN an AppError is instantiated with status parameter
- WHEN AppError(e?: unknown, status?: number) constructor is called
- THEN getErrorPublic() includes the provided statusCode
- AND the error code remains unchanged

### Requirement: AppVersionNotFoundError Default Status

The `AppVersionNotFoundError` class MUST have a default status code of `HttpStatus.NOT_FOUND` (404).

(Previously: AppVersionNotFoundError had no HTTP status mapping)

#### Scenario: AppVersionNotFoundError Default Status

- GIVEN AppVersionNotFoundError is instantiated
- WHEN AppVersionNotFoundError(e?: unknown) constructor is called
- THEN getErrorPublic() returns statusCode of 404
- AND the error code is preserved

## ADDED Requirements

### Requirement: AppError Status Code Validation

The system MUST validate that the status code provided to AppError is a valid HTTP status number.

The AppError constructor SHALL validate that status is a number between 100 and 599.

#### Scenario: Valid AppError Status Code

- GIVEN AppError constructor with status parameter
- WHEN AppError(e?: unknown, status?: number) is called with valid status
- THEN no validation error occurs
- AND the status is stored correctly

#### Scenario: Invalid AppError Status Code

- GIVEN AppError constructor with invalid status
- WHEN AppError(e?: unknown, status?: number) is called with invalid status
- THEN a TypeError is thrown
- AND the error is not created
