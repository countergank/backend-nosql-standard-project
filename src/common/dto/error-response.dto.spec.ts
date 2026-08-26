import { ErrorResponseDto } from './error-response.dto';

describe(ErrorResponseDto.name, () => {
  it('should create a valid error response with all required fields', () => {
    const response: ErrorResponseDto = {
      statusCode: 404,
      code: 'UA-ETY-001',
      message: 'Entity not found',
      traceId: 'abc-123',
      timestamp: '2026-07-25T20:58:13.123Z',
    };

    expect(response.statusCode).toBe(404);
    expect(response.code).toBe('UA-ETY-001');
    expect(response.message).toBe('Entity not found');
    expect(response.traceId).toBe('abc-123');
    expect(response.timestamp).toBe('2026-07-25T20:58:13.123Z');
  });

  it('should allow optional details field', () => {
    const response: ErrorResponseDto = {
      statusCode: 422,
      code: 'UA-COM-VALIDATION',
      message: 'Validation failed',
      details: [{ field: 'email', constraints: { isEmail: 'email must be valid' } }],
      traceId: 'abc-123',
      timestamp: '2026-07-25T20:58:13.123Z',
    };

    expect(response.details).toBeDefined();
    expect(response.details).toHaveLength(1);
    expect(response.details[0].field).toBe('email');
  });

  it('should work without details field', () => {
    const response: ErrorResponseDto = {
      statusCode: 500,
      code: 'UA-COM-000',
      message: 'Internal server error',
      traceId: 'abc-123',
      timestamp: '2026-07-25T20:58:13.123Z',
    };

    expect(response.details).toBeUndefined();
  });
});
