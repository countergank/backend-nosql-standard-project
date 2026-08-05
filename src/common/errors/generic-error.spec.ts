import { HttpStatus } from '@nestjs/common';
import { DomainError, ErrorKind, GenericError } from './domain.error';

describe('GenericError', () => {
  describe('default status', () => {
    it('should default to 500 INTERNAL_SERVER_ERROR when no status is provided', () => {
      const error = new GenericError(new Error('boom'));

      expect(error.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(error.code).toBe('GENERIC_ERROR');
      expect(error.getErrorPublic().statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('custom status', () => {
    it('should use the provided status in the public representation', () => {
      const error = new GenericError(new Error('nope'), HttpStatus.CONFLICT);

      expect(error.status).toBe(HttpStatus.CONFLICT);
      expect(error.getErrorPublic().statusCode).toBe(HttpStatus.CONFLICT);
    });
  });

  describe('message and traceId', () => {
    it('should expose the underlying message, a traceId and a timestamp', () => {
      const error = new GenericError(new Error('something failed'));

      expect(error.message).toBe('something failed');
      expect(error.traceId).toMatch(/^[0-9a-f-]{36}$/);
      expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(error.getErrorPublic().code).toBe('GENERIC_ERROR');
      expect(error.getErrorPublic().traceId).toBe(error.traceId);
      expect(error.getErrorPublic().timestamp).toBe(error.timestamp);
    });

    it('should stringify non-Error payloads instead of throwing', () => {
      const error = new GenericError({ reason: 'config' });

      expect(error.message).toBe('[object Object]');
    });
  });
});

describe('PARAMETER_* error kinds', () => {
  it('should register PARAMETER_NOT_FOUND with status 404', () => {
    expect(ErrorKind.PARAMETER_NOT_FOUND.statusCode).toBe(HttpStatus.NOT_FOUND);
    const error = DomainError.fromKind('PARAMETER_NOT_FOUND');

    expect(error.kind).toBe('PARAMETER_NOT_FOUND');
    expect(error.statusCode).toBe(HttpStatus.NOT_FOUND);
  });

  it('should register PARAMETER_ENV_OVERRIDDEN with status 409', () => {
    expect(ErrorKind.PARAMETER_ENV_OVERRIDDEN.statusCode).toBe(HttpStatus.CONFLICT);
    const error = DomainError.fromKind('PARAMETER_ENV_OVERRIDDEN');

    expect(error.kind).toBe('PARAMETER_ENV_OVERRIDDEN');
    expect(error.statusCode).toBe(HttpStatus.CONFLICT);
  });

  it('should register PARAMETER_INVALID_VALUE with status 422', () => {
    expect(ErrorKind.PARAMETER_INVALID_VALUE.statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    const error = DomainError.fromKind('PARAMETER_INVALID_VALUE');

    expect(error.kind).toBe('PARAMETER_INVALID_VALUE');
    expect(error.statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });
});
