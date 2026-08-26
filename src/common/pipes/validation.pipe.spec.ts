import { HttpStatus, ValidationError } from '@nestjs/common';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { createValidationException } from './validation.pipe';

describe('createValidationException', () => {
  it('should return an HttpException with 422 status', () => {
    const errors: ValidationError[] = [
      {
        property: 'email',
        constraints: { isEmail: 'email must be a valid email' },
        children: [],
      },
    ];

    const exception = createValidationException(errors);

    expect(exception).toBeDefined();
    expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it('should include details with field and constraints in the envelope', () => {
    const errors: ValidationError[] = [
      {
        property: 'email',
        constraints: { isEmail: 'email must be a valid email' },
        children: [],
      },
    ];

    const exception = createValidationException(errors);
    const response = exception.getResponse() as ErrorResponseDto;

    expect(response.statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(response.code).toBe('UA-COM-VALIDATION');
    expect(response.message).toBe('Validation failed');
    expect(response.details).toBeDefined();
    expect(response.details).toHaveLength(1);
    expect(response.details[0].field).toBe('email');
    expect(response.details[0].constraints).toEqual({ isEmail: 'email must be a valid email' });
  });

  it('should handle multiple validation errors', () => {
    const errors: ValidationError[] = [
      {
        property: 'email',
        constraints: { isEmail: 'email must be valid' },
        children: [],
      },
      {
        property: 'name',
        constraints: { isNotEmpty: 'name should not be empty' },
        children: [],
      },
    ];

    const exception = createValidationException(errors);
    const response = exception.getResponse() as ErrorResponseDto;

    expect(response.details).toHaveLength(2);
    expect(response.details[0].field).toBe('email');
    expect(response.details[1].field).toBe('name');
  });

  it('should include traceId and timestamp in the envelope', () => {
    const errors: ValidationError[] = [
      {
        property: 'email',
        constraints: { isEmail: 'email must be valid' },
        children: [],
      },
    ];

    const exception = createValidationException(errors);
    const response = exception.getResponse() as ErrorResponseDto;

    expect(response.traceId).toBe('');
    expect(response.timestamp).toBeDefined();
    expect(typeof response.timestamp).toBe('string');
  });
});
