# Delta for common-errors

## MODIFIED Requirements

### Requirement: GenericError Status Code Validation

The system MUST validate that status codes provided to GenericError are valid HTTP status numbers.

The GenericError constructor SHALL validate that status is a number between 100 and 599 inclusive.

When status is provided and is a valid HTTP status code, the GenericError constructor SHALL proceed with normal initialization and include the status in the returned error object.

If status is provided but is invalid, the GenericError constructor SHALL throw a TypeError with a descriptive message about the invalid status range.

(Previously: GenericError only accepted error objects/parameters, with no HTTP status code validation or inclusion. Status code values were not tracked or validated.)

#### Scenario: Valid HTTP Status Code Accepted

- GIVEN GenericError constructor with valid status parameter (e.g., 200, 404, 500)
- WHEN GenericError(e?: unknown, status?: number) constructor is called
- THEN the error is created successfully
- AND getErrorPublic() returns statusCode matching the valid status
- AND no TypeError is thrown

#### Scenario: Invalid HTTP Status Code Rejected

- GIVEN GenericError constructor with invalid status parameter (e.g., -1, 0, 600, NaN, string)
- WHEN GenericError(e?: unknown, status?: number) constructor is called
- THEN a TypeError is thrown
- AND the error is not created
- AND the status validation prevents invalid values

### Requirement: CommonError Validation Pipe

The system MUST implement a ValidationPipe that ensures error status codes conform to HTTP standards.

The ValidationPipe SHALL intercept and validate status codes used in error classes and request responses.

When a status code is outside the valid HTTP range (100-599), the pipe SHALL replace it with the default `HttpStatus.INTERNAL_SERVER_ERROR` (500) for error responses.

(Previously: No centralized validation of HTTP status codes in error handling, allowing potentially invalid status codes to propagate)

#### Scenario: ValidationPipe Corrects Invalid Status Code

- GIVEN a request handler returns an error with invalid status code (e.g., 999)
- WHEN ValidationPipe processes the request
- THEN pipe detects invalid status and replaces with 500
- AND error response includes corrected default status

#### Scenario: ValidationPipe Passes Valid Status Code

- GIVEN a request handler returns an error with valid status code (e.g., 404)
- WHEN ValidationPipe processes the request
- THEN pipe accepts valid status code
- AND error response preserves correct status
