# Delta for error-handling

## MODIFIED Requirements

### Requirement: Global Exception Filter

The GlobalExceptionFilter MUST inject `PinoLogger` instead of using `new Logger()` for structured error logging.

NestJS's `@Catch()` SHALL be used to catch both `ErrorBase` and `HttpException` subclasses.

The `GlobalExceptionFilter` class MUST:
- Inject `PinoLogger` to access structured logging with correlation IDs
- Inject `Request` to extract traceId and URL for correlation
- Inject `HttpArgumentsHost` to send responses
- Provide a `catch()` method that processes all error types using `PinoLogger.log(error)` for structured output

The filter SHALL modify existing error logging behavior to include correlation IDs and structured format, while maintaining all current error handling functionality.

(Previously: AllExceptionsFilter used `new Logger()` from @nestjs/common, providing only basic console logging without correlation ID propagation)

#### Scenario: ErrorBase Error Handling with PinoLogger

- GIVEN an unhandled ErrorBase subclass
- WHEN the filter injects PinoLogger and processes the error
- THEN response status matches error.statusCode
- AND response body includes envelope with code, message, traceId, timestamp
- AND error is logged via PinoLogger with correlation context

#### Scenario: HttpException Handling with PinoLogger

- GIVEN an HttpException subclass
- WHEN the filter injects PinoLogger and processes the error
- THEN response status matches the HttpException status
- AND response body includes the error envelope with extracted message
- AND error is logged via PinoLogger with correlation context

#### Scenario: Unknown Error Handling with PinoLogger

- GIVEN an unhandled exception not inheriting from ErrorBase or HttpException
- WHEN the filter injects PinoLogger and processes the error
- THEN response status is 500
- AND response body includes generic error message with traceId
- AND error is logged via PinoLogger with correlation context

## ADDED Requirements

### Requirement: PinoLogger for Error Logging

The system MUST use `PinoLogger` from `nestjs-pino` for all error logging in `AllExceptionsFilter`.

`AllExceptionsFilter` SHALL:
- Inject `PinoLogger` instead of creating standalone logger instances
- Use `PinoLogger.level`, `PinoLogger.debug()`, `PinoLogger.error()` methods for consistent log levels and structured output
- Include correlation ID (traceId) in all logged error entries
- Log errors with proper error context and structured format matching application logging standards

#### Scenario: PinoLogger Injection in AllExceptionsFilter

- GIVEN an AllExceptionsFilter class
- WHEN the class is instantiated in NestJS DI container
- THEN it injects PinoLogger from nestjs-pino module
- AND becomes available for structured error logging

#### Scenario: PinoLogger Error Logging

- GIVEN an exception in NestJS application
- WHEN AllExceptionsFilter catches and logs the error
- THEN error is logged via PinoLogger with structured format
- AND log includes correlation ID from request context
- AND error level matches exception severity (warn vs error)

## REMOVED Requirements

### Requirement: Standalone Logger for AllExceptionsFilter

The standalone logger usage in `AllExceptionsFilter` is being deprecated.

(Reason: Standalone `new Logger()` creates a separate logger instance that's not integrated with Pino correlation ID propagation. We need consistent structured logging throughout the application.)

(Migration: All `new Logger()` references in AllExceptionsFilter will be replaced with injected `PinoLogger`. Filter will automatically receive correlation IDs from request context.)
