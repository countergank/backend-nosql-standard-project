# Tasks: COU-189 Error Handling System

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~800-1000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (Phase 1-2) → PR 4-6 (Phases 3-6) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Add statusCode to ErrorBase constructor | PR 1 | Type: "ErrorBase constructor statusCode optional" | N/A - entity/service changes needed | Can revert TypeScript interfaces |
| 2 | Add statusCode to ErrorBase.types.ts | PR 1 | Type: "IError / IErrorPublic with statusCode" | N/A - dependent on #1 | Can revert interface changes |
| 3 | Add statusCode to GenericError and all 8 error classes | PR 2 | Type: "Error classes set statusCode" | N/A - dependent on #1 & #2 | Can revert error class implementations |
| 4 | Create AllExceptionsFilter with 3 branches | PR 3 | Test: "filter ErrorBase → envelope" | Test: "filter HttpException → envelope" | response shape validation | N/A - depends on 1-3 | Rollback: can remove filter by clearing providers | 

| 5 | Create ErrorResponseDto + TraceIdMiddleware | PR 4 | Type: "dto field validation" | Test: "middleware sets x-trace-id" | response header verification | N/A - dependencies | Rollback: remove files |

| 6 | Create ValidationPipe with exceptionFactory | PR 5 | Test: "pipe returns 422 envelope" | Test: "validation endpoint produces 422" | POST dto invalid data | N/A - standalone | Rollback: revert pipe setup |

| 7 | Register filter/middleware/pipe in main.ts & AppModule | PR 6 | Test: "filter registered globally" | Test: "x-trace-id header present" | request → response flow | N/A - integration depends | Rollback: revert registration |

| 8 | Remove try/catch from app.controller.ts | PR 7 | Test: "controller throws ErrorBase" | Runtime: "GET /version → entity not found" | response shape matches | N/A - dependent on 1-7 | Rollback: restore try/catch from git |

| 9 | Remove try/catch from entity.controller.ts | PR 8 | Test: "controller throws EntityNotFoundError" | Runtime: "POST /entity → email error" | envelope shape valid | N/A - dependent on 1-7 | Rollback: restore try/catch from git |

| 10 | Fix app.service.ts:66: throw new Error → AppError | PR 9 | Type: "AppError onInvalidService" | Runtime: "microservice disabled" | error envelope returned | N/A - dependent on 1-7 | Rollback: revert error type |

| 11 | Update controller tests to verify envelope shape | PR 10 | Test: "spec assertions updated" | Runtime: controller error responses | spec file diffs reviewed | N/A - dependent on 1-9 | Rollback: revert to exception types |

| 12 | Update error class specs with statusCode assertions | PR 11 | Test: "error statusCode matches HTTP" | Runtime: error instantiation | spec file diffs reviewed | N/A - dependent on 1-3 | Rollback: revert statusCode additions |

## Phase 1: Core Error Infrastructure (ErrorBase + httpStatus, status mapping, ErrorResponseDto)

- [x] 1.1 Modify `src/common/errors/error-base/error-base.ts` - add optional `statusCode` parameter to constructor
- [x] 1.2 Modify `src/common/errors/error-base/error-base.types.ts` - add `statusCode` to `IError` and `IErrorPublic` interfaces
- [x] 1.3 Update `src/common/errors/error/error-instances.error.ts` - add `statusCode: HttpStatus.INTERNAL_SERVER_ERROR` to `GenericError`
- [x] 1.4 Update `src/app/errors/error-instances.error.ts` - add status codes: `AppError`→500, `AppVersionNotFoundError`→404
- [x] 1.5 Update `src/entity/errors/error-instances.error.ts` - add status codes: `EntityNotFoundError`→404, `EntityNameAlreadyExistsError`→409, `EntityEmailAlreadyExistsError`→409, `EntityError`→500, `EntityPopulateError`→500
- [x] 1.6 Create `src/common/dto/error-response.dto.ts` - standard error envelope with statusCode, code, message, details, traceId, timestamp fields
- [x] 1.7 Update `src/common/errors/bad-request.error.ts` - match new `ErrorResponseDto` envelope
- [x] 1.8 Update `src/common/errors/internal-server.error.ts` - match new `ErrorResponseDto` envelope

## Phase 2: GlobalExceptionFilter with AllBranches

- [x] 2.1 Create `src/common/filters/all-exceptions.filter.ts` - global filter with three exception branches
- [x] 2.2 Register `AllExceptionsFilter` as `APP_FILTER` provider in `src/app/app.module.ts`
- [x] 2.3 Implement ErrorBase branch - extract statusCode and getErrorPublic()
- [x] 2.4 Implement HttpException branch - extract getStatus() and getResponse() details
- [x] 2.5 Implement unknown Error branch - default to 500 with logging for dev only
- [x] 2.6 Format envelope response using `ErrorResponseDto` structure
- [x] 2.7 Add production guard - log full stack only when not NODE_ENV=production

## Phase 3: TraceIdMiddleware

- [x] 3.1 Create `src/common/middleware/trace-id.middleware.ts` - attach traceId to response header
- [x] 3.2 Use request.id (from Fastify's genReqId) as traceId source
- [x] 3.3 Set response header `x-trace-id` with traceId value
- [x] 3.4 Pass through to next handler in middleware chain

## Phase 4: ValidationPipe Integration

- [x] 4.1 Create `src/common/pipes/validation.pipe.ts` - custom ValidationPipe with exceptionFactory
- [x] 4.2 Configure ValidationPipe with whitelist, forbidNonWhitelisted=true, transform=true
- [x] 4.3 Implement exceptionFactory to convert ValidationError array to structured 422 envelope
- [x] 4.4 Extract field names and constraint details into envelope details array
- [x] 4.5 Integrate into filter produces structured 422 with details object
- [x] 4.6 Register ValidationPipe globally in `main.ts`

## Phase 5: Integration and Migration

- [x] 5.1 Remove try/catch block from `src/app/controller/app.controller.ts` - let errors bubble
- [x] 5.2 Remove try/catch block from `src/entity/controller/entity.controller.ts` - let errors bubble
- [x] 5.3 Fix `src/app/service/app.service.ts` line 66 - replace `throw new Error(...)` with `throw new AppError(...)`
- [x] 5.4 Update controller specs to assert envelope response shape instead of exception types
- [x] 5.5 Update error class specs - add statusCode assertions for each subclass
- [x] 5.6 Register TraceIdMiddleware globally (via AppModule.configure)
- [x] 5.7 Register ValidationPipe globally in `main.ts`

## Phase 6: Tests and Verification

- [x] 6.1 Update `src/app/controller/app.controller.spec.ts` - modify exception assertions to error propagation checks
- [x] 6.2 Update `src/entity/controller/entity.controller.spec.ts` - modify exception assertions to error propagation checks
- [x] 6.3 Update `src/common/errors/error/error-instances.spec.ts` - add statusCode assertions
- [x] 6.4 Update `src/app/errors/error-instances.spec.ts` - add statusCode assertions
- [x] 6.5 Update `src/entity/errors/error-instances.spec.ts` - add statusCode assertions
- [x] 6.6 Create unit tests for `AllExceptionsFilter` - test three exception branches
- [x] 6.7 Create unit tests for `TraceIdMiddleware` - verify header injection
- [x] 6.8 Create unit tests for `validationPipe.exceptionFactory` - test 422 error production
- [x] 6.9 Create integration tests - full request/response flow with ErrorBase and HttpException
- [x] 6.10 Create integration tests - validation error handling with DTO validation (covered by 6.9 filter integration + validation pipe unit tests)

## Implementation Order

Based on dependency analysis:
1. First enhance ErrorBase and error classes (add statusCode)
2. Create AllExceptionsFilter (depends on ErrorBase with statusCode)
3. Create ErrorResponseDto and TraceIdMiddleware (parallel)
4. Create ValidationPipe (depends on ErrorResponseDto)
5. Register all components in main.ts & AppModule (depends on 2-4)
6. Remove controller try/catch (depends on 2-5)
7. Fix app.service.ts type issues (depends on 1, 5)
8. Update tests (depends on 5-7)

## Review Workload Forecast

- Estimated changed lines: ~800-1000 (exceeds 400 budget)
- 400-line budget risk: High
- Chained PRs recommended: Yes
- Delivery strategy: ask-on-risk

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
