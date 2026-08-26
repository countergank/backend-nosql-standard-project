import { HttpException, HttpStatus, ValidationError, ValidationPipe } from '@nestjs/common';
import { ErrorResponseDto } from '../dto/error-response.dto';

export function createValidationException(errors: ValidationError[]): HttpException {
  const details = errors.map((e) => ({
    field: e.property,
    constraints: e.constraints,
  }));

  const envelope: ErrorResponseDto = {
    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    code: 'UA-COM-VALIDATION',
    message: 'Validation failed',
    details,
    traceId: '',
    timestamp: new Date().toISOString(),
  };

  return new HttpException(envelope, HttpStatus.UNPROCESSABLE_ENTITY);
}

export const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: createValidationException,
});
