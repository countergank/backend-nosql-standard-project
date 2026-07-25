import { HttpStatus } from '@nestjs/common';
import { ErrorBase } from './error-base';
import { ErrorBaseEnum } from './error-base.enums';

class TestError extends ErrorBase {
  constructor(error: unknown, statusCode?: number) {
    super(ErrorBaseEnum.Common, '999', error, statusCode);
    Object.setPrototypeOf(this, TestError.prototype);
  }
}

describe(ErrorBase.name, () => {
  describe('statusCode', () => {
    it('should default to undefined when no statusCode is provided', () => {
      const error = new TestError('Test error');

      expect(error.statusCode).toBeUndefined();
    });

    it('should store the provided statusCode', () => {
      const error = new TestError('Test error', HttpStatus.NOT_FOUND);

      expect(error.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('should include statusCode in getErrorPublic() when provided', () => {
      const error = new TestError('Test error', HttpStatus.CONFLICT);
      const publicError = error.getErrorPublic();

      expect(publicError.statusCode).toBe(HttpStatus.CONFLICT);
    });

    it('should not include statusCode in getErrorPublic() when not provided', () => {
      const error = new TestError('Test error');
      const publicError = error.getErrorPublic();

      expect(publicError.statusCode).toBeUndefined();
    });

    it('should preserve backward compatibility of getErrorPublic shape', () => {
      const error = new TestError('Test error');
      const publicError = error.getErrorPublic();

      expect(publicError).toHaveProperty('message');
      expect(publicError).toHaveProperty('code');
      expect(publicError.message).toBe('Test error');
      expect(publicError.code).toContain('COM-999');
    });
  });
});
