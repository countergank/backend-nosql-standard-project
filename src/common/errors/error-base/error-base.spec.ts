import { HttpStatus } from '@nestjs/common';
import { DomainError, ErrorKind } from '../domain.error';

describe(DomainError.name, () => {
  describe('fromKind', () => {
    it('should create a DomainError with the correct statusCode', () => {
      const error = DomainError.fromKind('ENTITY_NOT_FOUND');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.kind).toBe('ENTITY_NOT_FOUND');
      expect(error.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('should use the registry message by default', () => {
      const error = DomainError.fromKind('ENTITY_NAME_ALREADY_EXISTS');

      expect(error.message).toBe(ErrorKind.ENTITY_NAME_ALREADY_EXISTS.message);
    });

    it('should accept a custom message override', () => {
      const error = DomainError.fromKind('ENTITY_NOT_FOUND', undefined, 'Custom message');

      expect(error.message).toBe('Custom message');
    });

    it('should capture cause stack when created from an Error', () => {
      const cause = new Error('Root cause');
      const error = DomainError.fromKind('INTERNAL_ERROR', cause);

      expect(error.stack).toBe(cause.stack);
    });
  });

  describe('internal', () => {
    it('should create a 500 INTERNAL_ERROR', () => {
      const error = DomainError.internal();

      expect(error.kind).toBe('INTERNAL_ERROR');
      expect(error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('ErrorKind registry', () => {
    it('should have all expected error kinds', () => {
      const kinds = Object.keys(ErrorKind);

      expect(kinds).toContain('INTERNAL_ERROR');
      expect(kinds).toContain('APP_ERROR');
      expect(kinds).toContain('APP_VERSION_NOT_FOUND');
      expect(kinds).toContain('ENTITY_ERROR');
      expect(kinds).toContain('ENTITY_NOT_FOUND');
      expect(kinds).toContain('ENTITY_NAME_ALREADY_EXISTS');
      expect(kinds).toContain('ENTITY_EMAIL_ALREADY_EXISTS');
      expect(kinds).toContain('ENTITY_POPULATE');
    });

    it('should have unique kind strings', () => {
      const kindStrings = Object.values(ErrorKind).map((e) => e.kind);
      const unique = new Set(kindStrings);

      expect(unique.size).toBe(kindStrings.length);
    });
  });
});
