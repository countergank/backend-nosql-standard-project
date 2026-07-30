# Delta for error-base

## ADDED Requirements

### Requirement: ErrorBase Enhanced with HTTP Status Code

The system MUST extend `ErrorBase` to carry an optional HTTP status code property.

The `ErrorBase` class SHALL include a `statusCode?: number` property that remains optional for backwards compatibility.

The property should be added to the constructor parameters and accessible via public getter.

#### Scenario: ErrorBase Status Code Property

- GIVEN an ErrorBase instance is created
- WHEN ErrorBase constructor accepts optional statusCode parameter
- THEN the instance has a public statusCode property of type number
- AND the property defaults to undefined when not provided

#### Scenario: ErrorBase Status Code Optional

- GIVEN existing code using ErrorBase without statusCode
- WHEN ErrorBase is used as before
- THEN existing behavior remains unchanged
- AND no validation errors occur

## MODIFIED Requirements

### Requirement: IErrorPublic Interface Updated with Status Code

The `IErrorPublic` interface MUST include the optional `statusCode?: number` property.

The interface should maintain backwards compatibility with existing error public representations.

(Previously: IErrorPublic only had message and code properties, no HTTP status mapping)

#### Scenario: IErrorPublic Backward Compatibility

- GIVEN existing code expecting IErrorPublic with only message and code
- WHEN IErrorPublic is extended with statusCode
- THEN existing code continues to work without modification
- AND new code can optionally include statusCode

#### Scenario: IErrorPublic Status Code Access

- GIVEN a public error object is created
- WHEN it is typed as IErrorPublic
- THEN the object can optionally expose statusCode property
- AND the statusCode is accessible if provided
