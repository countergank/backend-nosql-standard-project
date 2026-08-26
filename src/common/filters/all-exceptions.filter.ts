import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { DomainError } from '../errors/domain.error';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@InjectPinoLogger(AllExceptionsFilter.name) private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    const traceId = (request.id as string) || 'unknown';
    const timestamp = new Date().toISOString();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown = undefined;

    if (exception instanceof DomainError) {
      statusCode = exception.statusCode;
      code = exception.kind;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        code = (resp.code as string) || `UA-HTTP-${statusCode}`;
        message = (resp.message as string) || exception.message;
        details = resp.details;
      } else {
        message = exception.message;
      }
    }

    this.logger.error(
      { traceId, statusCode, code, message, details, timestamp, url: request.url, method: request.method },
      `Exception caught: ${message}`,
    );

    const envelope: ErrorResponseDto = {
      statusCode,
      code,
      message,
      traceId,
      timestamp,
    };

    if (details !== undefined) {
      envelope.details = details;
    }

    response.status(statusCode).send(envelope);
  }
}
