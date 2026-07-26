# Design: COU-189 Error Handling System — Global Exception Filter + Error Hierarchy

## Technical Approach

Implement a centralized error handling system by:
1. **Extending `ErrorBase`** with an optional `statusCode` property to carry HTTP status codes
2. **Mapping each error class** to its appropriate HTTP status code (400, 404, 409, 500)
3. **Creating a single `AllExceptionsFilter`** registered globally via `APP_FILTER`
4. **Adding `TraceIdMiddleware`** to generate/attach UUID v4 trace IDs to requests/responses
5. **Creating a standardized `ErrorResponseDto`** envelope with `statusCode`, `code`, `message`, `details`, `traceId`, `timestamp`
6. **Integrating `ValidationPipe`** with a custom exception factory for structured 422 validation errors
7. **Removing all manual try/catch blocks** from controllers — the global filter handles everything
8. **Environment-aware stack traces** — only in development

---

## Architecture Decisions

### Decision: Single Global Exception Filter

| Choice | Tradeoff | Decision |
|--------|----------|----------|
| Single `AllExceptionsFilter` via `APP_FILTER` | Single maintenance point; catches ALL exceptions including framework-level | ✅ **Chosen** — matches NestJS best practices, single source of truth |
| Multiple `@Catch()` filters per error type | More granular control | ❌ Rejected — NestJS filter ordering is fragile; adds complexity |

### Decision: Extend ErrorBase with `statusCode`

| Choice | Tradeoff | Decision |
|--------|----------|----------|
| Add optional `statusCode` to `ErrorBase` constructor | Minimal change to existing hierarchy; backward compatible | ✅ **Chosen** |
| Separate `HttpErrorBase` subclass | Clean separation but breaks existing inheritance | ❌ Rejected — breaks existing 8 error classes |
| Map status in filter via errorGroup/code lookup | Decoupled but requires manual mapping table | ❌ Rejected — duplication, error-prone |

### Decision: TraceIdMiddleware via Fastify `genReqId`

| Choice | Tradeoff | Decision |
|--------|----------|----------|
| Use Fastify's built-in `genReqId` (already configured with hyperid) | Zero additional middleware; request ID already generated | ✅ **Chosen** — already in `main.ts` line 21-23 |
| Custom NestJS middleware | More NestJS-idiomatic but duplicates functionality | ❌ Rejected — Fastify adapter already handles this |

### Decision: Standardized Error Envelope

```typescript
{
  statusCode: number;    // HTTP status (400, 404, 409, 422, 500)
  code: string;          // UA-ETY-001, UA-APP-001, etc.
  message: string;       // Human-readable message
  details?: any;         // Validation errors, extra context
  traceId: string;       // UUID v4 from Fastify request.id
  timestamp: string;     // ISO 8601
}
```

**Why**: Matches existing `IErrorPublic` shape (`code`, `message`) + adds `statusCode`, `traceId`, `timestamp`, `details`. Compatible with existing Swagger DTOs (`BadRequestError`, `InternalServerError`).

### Decision: ValidationPipe Integration

| Choice | Tradeoff | Decision |
|--------|----------|----------|
| Global `ValidationPipe` with `exceptionFactory` | Centralized validation error shape; consistent with error envelope | ✅ **Chosen** |
| Keep manual DTO validation in controllers | More control but scattered logic | ❌ Rejected |

---

## Data Flow

```
Request → Fastify (genReqId) → TraceIdMiddleware (attach to response headers)
    → ValidationPipe (422 if DTO invalid)
    → Controller (throws ErrorBase subclasses / HttpException / raw Error)
    → AllExceptionsFilter (catches ALL)
        ├─ ErrorBase instance → extract statusCode, getErrorPublic() → envelope
        ├─ HttpException → getStatus(), getResponse() → envelope
        └─ unknown Error → 500 + log stack → envelope
    → Response (JSON envelope + traceId header)
```

ASCII diagram:
```
┌─────────────────┐
│   Fastify       │── genReqId() → request.id (UUID v4)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ TraceIdMiddleware    │── response.setHeader('x-trace-id', request.id)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ValidationPipe  │── exceptionFactory → 422 ErrorEnvelope
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Controller      │── throws EntityNotFoundError / AppError / raw Error
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ AllExceptionsFilter (global, APP_FILTER)                    │
│   if (exception instanceof ErrorBase)       → statusCode   │
│   else if (exception instanceof HttpException) → getStatus()│
│   else                                        → 500         │
│   envelope = { statusCode, code, message, details,          │
│                traceId: request.id, timestamp }              │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ JSON Response   │
└─────────────────┘
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/common/errors/error-base/error-base.ts` | Modify | Add optional `statusCode` to constructor, store as property |
| `src/common/errors/error-base/error-base.types.ts` | Modify | Add `statusCode` to `IError` and `IErrorPublic` |
| `src/common/errors/error-base/error-base.enums.ts` | No change | Keep existing error groups |
| `src/common/errors/error/error-instances.error.ts` | Modify | Add `statusCode: HttpStatus.INTERNAL_SERVER_ERROR` (500) to `GenericError` |
| `src/app/errors/error-instances.error.ts` | Modify | Add status codes: `AppError`→500, `AppVersionNotFoundError`→404 |
| `src/entity/errors/error-instances.error.ts` | Modify | Add status codes per error type (400, 404, 409, 500) |
| `src/common/errors/error.dictionary.ts` | No change | Keep existing codes/messages |
| `src/app/errors/error.dictionary.ts` | No change | Keep existing codes/messages |
| `src/entity/errors/error.dictionary.ts` | No change | Keep existing codes/messages |
| `src/common/filters/all-exceptions.filter.ts` | **Create** | Global exception filter implementation |
| `src/common/middleware/trace-id.middleware.ts` | **Create** | Attach traceId to response headers |
| `src/common/dto/error-response.dto.ts` | **Create** | Standard error response envelope DTO |
| `src/common/pipes/validation.pipe.ts` | **Create** | Custom ValidationPipe with exceptionFactory |
| `src/main.ts` | Modify | Register `ValidationPipe` globally, add `TraceIdMiddleware` |
| `src/app/app.module.ts` | Modify | Register `APP_FILTER` provider for `AllExceptionsFilter` |
| `src/entity/controller/entity.controller.ts` | Modify | Remove ALL try/catch blocks; let errors bubble |
| `src/app/controller/app.controller.ts` | Modify | Remove ALL try/catch blocks; let errors bubble |
| `src/app/service/app.service.ts` | Modify | Line 66: replace `throw new Error(...)` with `throw new AppError(...)` |
| `src/common/errors/bad-request.error.ts` | Modify | Update to match new `ErrorResponseDto` envelope |
| `src/common/errors/internal-server.error.ts` | Modify | Update to match new `ErrorResponseDto` envelope |
| `src/common/api-docs/defaults.decorator.ts` | Modify | Update Swagger error response types |
| `src/entity/controller/entity.controller.spec.ts` | Modify | Update test assertions to expect error envelopes |
| `src/app/controller/app.controller.spec.ts` | Modify | Update test assertions to expect error envelopes |
| `src/common/errors/error/error-instances.spec.ts` | Modify | Add `statusCode` assertions |
| `src/app/errors/error-instances.spec.ts` | Modify | Add `statusCode` assertions |
| `src/entity/errors/error-instances.spec.ts` | Modify | Add `statusCode` assertions |

---

## Interfaces / Contracts

### ErrorBase (Enhanced)

```typescript
// src/common/errors/error-base/error-base.ts
export class ErrorBase {
  public errorGroup: string;
  public message: string;
  public code: string;
  public timestamp: string;
  public stack: string;
  public statusCode: number;          // NEW: HTTP status code
  private appId: string = ErrorBaseEnum.App;

  constructor(
    errorGroup: string,
    code: string,
    error: unknown,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR  // NEW: optional, default 500
  ) { ... }
}
```

### Error Dictionaries with Status Codes

```typescript
// src/entity/errors/error-instances.error.ts
export class EntityNotFoundError extends ErrorBase {
  constructor(e?: unknown) {
    super(
      ErrorBaseEnum.Entity,
      ErrorCodes.EntityNotFound,
      e ?? ErrorMessages[ErrorCodes.EntityNotFound],
      HttpStatus.NOT_FOUND  // 404
    );
  }
}

export class EntityEmailAlreadyExistsError extends ErrorBase {
  constructor(e?: unknown) {
    super(
      ErrorBaseEnum.Entity,
      ErrorCodes.EntityEmailAlreadyExists,
      e ?? ErrorMessages[ErrorCodes.EntityEmailAlreadyExists],
      HttpStatus.CONFLICT  // 409
    );
  }
}

export class EntityNameAlreadyExistsError extends ErrorBase {
  constructor(e?: unknown) {
    super(
      ErrorBaseEnum.Entity,
      ErrorCodes.EntityNameAlreadyExists,
      e ?? ErrorMessages[ErrorCodes.EntityNameAlreadyExists],
      HttpStatus.CONFLICT  // 409
    );
  }
}

export class EntityPopulateError extends ErrorBase {
  constructor(e?: unknown) {
    super(
      ErrorBaseEnum.Entity,
      ErrorCodes.EntityPopulate,
      e ?? ErrorMessages[ErrorCodes.EntityPopulate],
      HttpStatus.INTERNAL_SERVER_ERROR  // 500
    );
  }
}

export class EntityError extends ErrorBase {
  constructor(e?: unknown) {
    super(
      ErrorBaseEnum.Entity,
      ErrorCodes.Base,
      e ?? ErrorMessages[ErrorCodes.Base],
      HttpStatus.INTERNAL_SERVER_ERROR  // 500
    );
  }
}
```

```typescript
// src/app/errors/error-instances.error.ts
export class AppVersionNotFoundError extends ErrorBase {
  constructor(e?: unknown) {
    super(
      ErrorBaseEnum.App,
      ErrorCodes.AppVersionNotFound,
      e ?? ErrorMessages[ErrorCodes.AppVersionNotFound],
      HttpStatus.NOT_FOUND  // 404
    );
  }
}

export class AppError extends ErrorBase {
  constructor(e?: unknown) {
    super(
      ErrorBaseEnum.App,
      ErrorCodes.Base,
      e ?? ErrorMessages[ErrorCodes.Base],
      HttpStatus.INTERNAL_SERVER_ERROR  // 500
    );
  }
}
```

```typescript
// src/common/errors/error/error-instances.error.ts
export class GenericError extends ErrorBase {
  constructor(e?: unknown) {
    super(
      ErrorBaseEnum.Common,
      ErrorCodes.Base,
      e ?? ErrorMessages[ErrorCodes.Base],
      HttpStatus.INTERNAL_SERVER_ERROR  // 500
    );
  }
}
```

### ErrorResponseDto (Standard Envelope)

```typescript
// src/common/dto/error-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  @IsNumber()
  statusCode: number;

  @ApiProperty({ example: 'UA-ETY-001' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Entity not found' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ example: { field: 'email', message: 'must be unique' } })
  @IsOptional()
  details?: any;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  traceId: string;

  @ApiProperty({ example: '2026-07-25T20:58:13.123Z' })
  @IsString()
  timestamp: string;
}
```

### AllExceptionsFilter

```typescript
// src/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorBase } from '../errors/error-base/error-base';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { isProd } from '../utils';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    const traceId = request.id || 'unknown';
    const timestamp = new Date().toISOString();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'UA-COM-000';
    let message = 'Internal server error';
    let details: any = undefined;

    if (exception instanceof ErrorBase) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        code = (res as any).code || `UA-HTTP-${statusCode}`;
        message = (res as any).message || exception.message;
        details = (res as any).details;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      // Unknown error — log full stack in dev only
      this.logger.error(exception.message, isProd() ? undefined : exception.stack);
    }

    const envelope: ErrorResponseDto = {
      statusCode,
      code,
      message,
      ...(details && { details }),
      traceId,
      timestamp,
    };

    response.status(statusCode).send(envelope);
  }
}
```

### ValidationPipe with Custom Exception Factory

```typescript
// src/common/pipes/validation.pipe.ts
import { ValidationPipe, ValidationError } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { ErrorResponseDto } from '../dto/error-response.dto';

export const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: (errors: ValidationError[]) => {
    const details = errors.map((e) => ({
      field: e.property,
      constraints: e.constraints,
    }));
    const envelope: ErrorResponseDto = {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY, // 422
      code: 'UA-COM-VALIDATION',
      message: 'Validation failed',
      details,
      traceId: '', // will be filled by filter
      timestamp: new Date().toISOString(),
    };
    return new HttpException(envelope, HttpStatus.UNPROCESSABLE_ENTITY);
  },
});
```

### TraceIdMiddleware

```typescript
// src/common/middleware/trace-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express'; // Fastify types compatible

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const traceId = (req as any).id || (req as any).traceId || 'unknown';
    res.setHeader('x-trace-id', traceId);
    next();
  }
}
```

**Note**: Fastify adapter already generates `request.id` via `hyperid().uuid()` in `main.ts`. This middleware simply propagates it to the response header.

---

## Module Structure

```
src/common/
├── errors/
│   ├── error-base/
│   │   ├── error-base.ts              ← MODIFIED: add statusCode
│   │   ├── error-base.types.ts        ← MODIFIED: add statusCode to IError/IErrorPublic
│   │   ├── error-base.enums.ts        ← UNCHANGED
│   │   └── error-base.helpers.ts      ← UNCHANGED
│   ├── error/
│   │   ├── error-instances.error.ts   ← MODIFIED: GenericError statusCode = 500
│   │   └── error.dictionary.ts        ← UNCHANGED
│   ├── bad-request.error.ts           ← MODIFIED: match ErrorResponseDto
│   ├── internal-server.error.ts       ← MODIFIED: match ErrorResponseDto
│   └── index.ts                       ← NEW: barrel export
├── filters/
│   └── all-exceptions.filter.ts       ← NEW
├── middleware/
│   └── trace-id.middleware.ts         ← NEW
├── dto/
│   └── error-response.dto.ts          ← NEW
├── pipes/
│   └── validation.pipe.ts             ← NEW
└── utils/
    └── index.ts                       ← has isProd()

src/app/
├── errors/
│   ├── error-instances.error.ts       ← MODIFIED: add statusCode to AppError, AppVersionNotFoundError
│   └── error.dictionary.ts            ← UNCHANGED
├── app.module.ts                      ← MODIFIED: provide APP_FILTER
└── controller/app.controller.ts       ← MODIFIED: remove try/catch

src/entity/
├── errors/
│   ├── error-instances.error.ts       ← MODIFIED: add statusCode to all 5 errors
│   └── error.dictionary.ts            ← UNCHANGED
└── controller/entity.controller.ts    ← MODIFIED: remove try/catch

src/main.ts                            ← MODIFIED: useGlobalPipes(validationPipe), useGlobalMiddleware(TraceIdMiddleware)
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| **Unit** | `ErrorBase` + subclasses | Instantiate each error class; assert `statusCode` matches expected HTTP code; verify `getErrorPublic()` includes `statusCode` |
| **Unit** | `AllExceptionsFilter` | Mock `ArgumentsHost`, `FastifyRequest`, `FastifyReply`; test 3 branches: `ErrorBase` → envelope with `statusCode`, `HttpException` → envelope with `getStatus()`, unknown `Error` → 500 envelope; verify response shape & `traceId` header |
| **Unit** | `TraceIdMiddleware` | Mock req/res/next; assert `x-trace-id` header equals `req.id` |
| **Unit** | `validationPipe.exceptionFactory` | Pass array of `ValidationError`; assert returned `HttpException` has 422 status and envelope with `details` array |
| **Integration** | Full request → error → response | Use `supertest` against Fastify app; hit endpoints that throw known errors (`EntityNotFoundError`, `EntityEmailAlreadyExistsError`, raw `Error`); assert response body matches `ErrorResponseDto` shape, status codes (404, 409, 500), `x-trace-id` header present |
| **Integration** | Validation errors | Send invalid DTO to `POST /entity/create`; assert 422 with `details` array containing field/constraints |

### Test Updates Required

- **`entity.controller.spec.ts`**: Change `rejects.toThrow(BadRequestException)` → assert response body matches envelope with `statusCode: 400/409`, `code: 'UA-ETY-002/003'`
- **`app.controller.spec.ts`**: Change `rejects.toThrow(BadRequestException)` → assert envelope with `statusCode: 404`, `code: 'UA-APP-001'`
- **Error instance specs**: Add `expect(error.statusCode).toBe(HttpStatus.XXX)` for each class

---

## Migration Strategy

### Phase 1: Enhance ErrorBase + Error Classes (No Breaking Changes)
1. Add optional `statusCode` parameter to `ErrorBase` constructor (default 500)
2. Add `statusCode` to `IError` / `IErrorPublic` types
3. Update all 8 error subclasses with appropriate status codes
4. Run existing error unit tests — they should pass (backward compatible)

### Phase 2: Create Global Filter + Envelope + Middleware + Pipe
1. Create `ErrorResponseDto`, `AllExceptionsFilter`, `TraceIdMiddleware`, `validationPipe`
2. Register `APP_FILTER` in `AppModule`
3. Register `validationPipe` and `TraceIdMiddleware` in `main.ts`
4. **Do NOT remove controller try/catch yet** — both systems coexist temporarily

### Phase 3: Remove Controller Boilerplate
1. Remove all `try/catch` blocks from `EntityController` and `AppController`
2. Let errors bubble to global filter
3. Fix `AppService` line 66: `throw new Error(...)` → `throw new AppError(...)`

### Phase 4: Update Tests & Swagger
1. Update controller test assertions to match new envelope shape
2. Update Swagger DTOs (`BadRequestError`, `InternalServerError`) to extend `ErrorResponseDto`
3. Run full test suite — all should pass with new envelope format

### Phase 5: Cleanup
1. Remove unused imports (`BadRequestException`, `InternalServerErrorException` from controllers)
2. Verify no raw `throw new Error()` remains in services

---

## Threat Matrix

**Applicability**: This design **does not** change routing, shell commands, subprocesses, VCS/PR automation, executable-file classification, or process integration boundaries.

> N/A — No routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary changes in this design.

---

## Open Questions

- [ ] Should `ValidationPipe` be registered globally in `main.ts` or via `APP_PIPE` in `AppModule`? (Global in main.ts is simpler and matches current pattern)
- [ ] Do we need a separate `HttpException` envelope shape, or is the unified `ErrorResponseDto` sufficient for all cases? (Current design uses unified envelope)
- [ ] Should `traceId` be included in Swagger `ErrorResponseDto` example? (Yes, for documentation completeness)
- [ ] Is `hyperid().uuid()` in `main.ts` sufficient for trace ID, or should we use a dedicated UUID v4 library? (hyperid is already a dependency; it's fine)

---

## Next Step

Ready for **sdd-tasks** phase to break this design into implementation tasks.