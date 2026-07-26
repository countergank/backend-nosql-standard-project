import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { DomainError } from '../errors/domain.error';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe(AllExceptionsFilter.name, () => {
  let filter: AllExceptionsFilter;
  let mockRequest: Partial<FastifyRequest>;
  let mockResponse: Partial<FastifyReply>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    mockRequest = {
      id: 'test-trace-id-123',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    } as unknown as ArgumentsHost;

    // Fix the chained mock: switchToHttp returns an object with getRequest/getResponse
    (mockHost.switchToHttp as jest.Mock).mockReturnValue({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    });
  });

  describe('DomainError branch', () => {
    it('should return envelope with DomainError statusCode and kind', () => {
      const error = DomainError.fromKind('ENTITY_NOT_FOUND');
      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          code: error.kind,
          message: error.message,
          traceId: 'test-trace-id-123',
        }),
      );
    });

    it('should include timestamp in the envelope', () => {
      const error = DomainError.fromKind('ENTITY_NOT_FOUND');
      filter.catch(error, mockHost);

      const sentEnvelope = (mockResponse.send as jest.Mock).mock.calls[0][0] as ErrorResponseDto;
      expect(sentEnvelope.timestamp).toBeDefined();
      expect(typeof sentEnvelope.timestamp).toBe('string');
      expect(() => new Date(sentEnvelope.timestamp)).not.toThrow();
    });
  });

  describe('HttpException branch', () => {
    it('should return envelope with HttpException status and message', () => {
      const error = new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);
      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Forbidden resource',
        }),
      );
    });

    it('should extract object response from HttpException', () => {
      const error = new HttpException({ message: 'Custom error', code: 'UA-CUSTOM-001' }, HttpStatus.BAD_REQUEST);
      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'UA-CUSTOM-001',
          message: 'Custom error',
        }),
      );
    });

    it('should fallback to default code when HttpException response has no code', () => {
      const error = new HttpException('Simple error', HttpStatus.BAD_REQUEST);
      filter.catch(error, mockHost);

      const sentEnvelope = (mockResponse.send as jest.Mock).mock.calls[0][0] as ErrorResponseDto;
      expect(sentEnvelope.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(sentEnvelope.message).toBe('Simple error');
      expect(sentEnvelope.code).toBeDefined();
    });
  });

  describe('Unknown Error branch', () => {
    it('should return 500 for unknown errors', () => {
      const error = new Error('Something unexpected happened');
      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        }),
      );
    });

    it('should still include traceId and timestamp for unknown errors', () => {
      const error = new Error('Something unexpected happened');
      filter.catch(error, mockHost);

      const sentEnvelope = (mockResponse.send as jest.Mock).mock.calls[0][0] as ErrorResponseDto;
      expect(sentEnvelope.traceId).toBe('test-trace-id-123');
      expect(sentEnvelope.timestamp).toBeDefined();
    });
  });

  describe('traceId handling', () => {
    it('should use request.id as traceId', () => {
      const error = DomainError.fromKind('ENTITY_NOT_FOUND');
      filter.catch(error, mockHost);

      const sentEnvelope = (mockResponse.send as jest.Mock).mock.calls[0][0] as ErrorResponseDto;
      expect(sentEnvelope.traceId).toBe('test-trace-id-123');
    });

    it('should fallback to "unknown" when request.id is missing', () => {
      mockRequest.id = undefined;
      const error = DomainError.fromKind('ENTITY_NOT_FOUND');
      filter.catch(error, mockHost);

      const sentEnvelope = (mockResponse.send as jest.Mock).mock.calls[0][0] as ErrorResponseDto;
      expect(sentEnvelope.traceId).toBe('unknown');
    });
  });
});
