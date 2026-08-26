# Delta for error-handling

## ADDED Requirements

### Requirement: ErrorBase Enhanced with HTTP Status

The system MUST extend `ErrorBase` to carry an HTTP status code property.

The `ErrorBase` class SHALL include an optional `statusCode?: number` property.

The `IErrorPublic` interface MUST include an optional `statusCode?: number` property.

#### Scenario: ErrorBase Status Code Usage

- GIVEN an error instance created with a status
- WHEN `getErrorPublic()` is called
- THEN the returned object includes the `statusCode` property
- AND the status is of type number

#### Scenario: ErrorBase Without Status Code

- GIVEN an error instance created without status
- WHEN `getErrorPublic()` is called
- THEN the returned object excludes the `statusCode` property
- AND only message and code are included (backwards compatible)

## MODIFIED Requirements

### Requirement: GenericError with Status Code

GenericError MUST implement status codes through constructor injection.

The `GenericError` class SHALL accept an optional `status?: number` parameter.

When status is provided, `getErrorPublic()` SHALL include statusCode in the returned object.

If status is not provided, default to `HttpStatus.INTERNAL_SERVER_ERROR`.

(Previously: GenericError had no status or HTTP mapping, only message and code)

#### Scenario: GenericError with Custom Status

- GIVEN a GenericError constructor with status parameter
- WHEN GenericError(e?: unknown, status?: number) is instantiated
- THEN getErrorPublic() includes statusCode matching the provided status

#### Scenario: GenericError Default Status

- GIVEN a GenericError constructor without status parameter
- WHEN GenericError(e?: unknown) is instantiated
- THEN getErrorPublic() includes default statusCode of 500

### Requirement: AppError with HTTP Status Mapping

AppError MUST support HTTP status codes for common application errors.

The `AppError` class SHALL accept an optional `status?: number` parameter.

The `AppVersionNotFoundError` class SHALL have statusCode `HttpStatus.NOT_FOUND` (404).

(Previously: AppError and AppVersionNotFoundError had no HTTP status mapping)

#### Scenario: AppError with Status

- GIVEN an AppError constructor with status parameter
- WHEN AppError(e?: unknown, status?: number) is instantiated
- THEN getErrorPublic() includes statusCode matching the provided status

#### Scenario: AppVersionNotFoundError Default Status

- GIVEN AppVersionNotFoundError instantiation
- WHEN AppVersionNotFoundError(e?: unknown) is called
- THEN getErrorPublic() includes statusCode of 404

## ADDED Requirements

### Requirement: 5 Entity Errors with Status Codes

All EntityError subclasses MUST support HTTP status codes.

The EntityError base class SHALL include optional `status?: number` parameter.

EntityNotFoundError SHALL have statusCode `HttpStatus.NOT_FOUND` (404).
EntityNameAlreadyExistsError SHALL have statusCode `HttpStatus.CONFLICT` (409).
EntityEmailAlreadyExistsError SHALL have statusCode `HttpStatus.CONFLICT` (409).
EntityPopulateError SHALL have statusCode `HttpStatus.BAD_REQUEST` (400).

(Previously: EntityError hierarchy had no HTTP status mapping)

#### Scenario: EntityNotFoundError Status

- GIVEN EntityNotFoundError instantiation
- WHEN EntityNotFoundError(e?: unknown) is called
- THEN getErrorPublic() includes statusCode of 404

#### Scenario: EntityNameAlreadyExistsError Status

- GIVEN EntityNameAlreadyExistsError instantiation
- WHEN EntityNameAlreadyExistsError(e?: unknown) is called
- THEN getErrorPublic() includes statusCode of 409

#### Scenario: EntityEmailAlreadyExistsError Status

- GIVEN EntityEmailAlreadyExistsError instantiation
- WHEN EntityEmailAlreadyExistsError(e?: unknown) is called
- THEN getErrorPublic() includes statusCode of 409

#### Scenario: EntityPopulateError Status

- GIVEN EntityPopulateError instantiation
- WHEN EntityPopulateError(e?: unknown) is called
- THEN getErrorPublic() includes statusCode of 400

## ADDED Requirements

### Requirement: Global Exception Filter

The system MUST implement a global exception filter to handle all errors consistently.

NestJS's `@Catch()` SHALL be used to catch both `ErrorBase` and `HttpException` subclasses.

The `GlobalExceptionFilter` class MUST:
- Inject `Request` to extract traceId and URL
- Inject `HttpArgumentsHost` to send responses
- Provide a `catch()` method that processes all error types

#### Scenario: ErrorBase Error Handling

- GIVEN an unhandled ErrorBase subclass
- WHEN the filter processes the error
- THEN response status matches error.statusCode
- AND response body includes envelope with code, message, traceId, timestamp

#### Scenario: HttpException Handling

- GIVEN an HttpException subclass
- WHEN the filter processes the error
- THEN response status matches the HttpException status
- AND response body includes the error envelope with extracted message

#### Scenario: Unknown Error Handling

- GIVEN an unhandled exception not inheriting from ErrorBase or HttpException
- WHEN the filter processes the error
- THEN response status is 500
- AND response body includes generic error message with traceId

## ADDED Requirements

### Requirement: TraceId Middleware

The system MUST generate a unique traceId for each request.

The `TraceIdMiddleware` class SHALL generate a UUIDv4 per request.

The `traceId` must be added to:
- Response headers for error responses
- Response headers for success responses
- Request headers for downstream services

#### Scenario: TraceId Generation

- GIVEN an incoming HTTP request
- WHEN TraceIdMiddleware processes the request
- THEN a UUID is generated and added to request headers
- AND the same UUID is returned in responses

#### Scenario: TraceId in Error Responses

- GIVEN an error occurs during request processing
- WHEN the global filter sends error response
- THEN the response headers include `x-trace-id` with the generated traceId
- AND the response body includes `traceId` field

## ADDED Requirements

### Requirement: Error Response Envelope

All error responses MUST follow a consistent JSON envelope structure.

The envelope SHALL include:
- `statusCode`: HTTP status code (number)
- `code`: Application error code (string)
- `message`: Human-readable error message (string)
- `traceId`: Unique request identifier (string)
- `timestamp`: ISO 8601 timestamp (string)
- `details?: any`: Optional additional error details

#### Scenario: Error Response Structure

- GIVEN an ErrorBase error
- WHEN GlobalExceptionFilter formats the response
- THEN response body matches envelope structure
- AND all required fields are present

#### Scenario: Success Response Not Affected

- GIVEN a successful request
- WHEN controller returns data
- THEN responses remain unchanged in format
- AND no error envelope is added

## ADDED Requirements

### Requirement: Global Filter Registration

The GlobalExceptionFilter MUST be available throughout the application.

NestJS's `APP_FILTER` token SHALL be used to register the filter as a global singleton.

The filter registration MUST occur in `AppModule` providers.

#### Scenario: Filter Registration

- GIVEN the application bootstrap process
- WHEN AppModule is configured
- THEN APP_FILTER provider includes GlobalExceptionFilter
- AND all controllers inherit global error handling

### Requirement: TraceId Middleware Order

TraceIdMiddleware MUST be registered before the global filter.

NestJS's `middleware` array in `AppModule` SHALL place `TraceIdMiddleware` before filter registration.

The middleware order affects traceId availability in error responses.

#### Scenario: Middleware Order Validation

- GIVEN middleware and filter registration in AppModule
- WHEN AppModule is imported
- THEN TraceIdMiddleware appears before global filter in middleware array
- AND traceId is available in error responses
