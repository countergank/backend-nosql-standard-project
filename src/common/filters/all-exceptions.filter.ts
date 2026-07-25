import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { ErrorBase } from '../errors/error-base/error-base';
import { isProd } from '../utils';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    const traceId = (request.id as string) || 'unknown';
    const timestamp = new Date().toISOString();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'UA-COM-000';
    let message = 'Internal server error';
    let details: unknown = undefined;

    if (exception instanceof ErrorBase) {
      statusCode = exception.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
      code = exception.code;
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
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, isProd() ? undefined : exception.stack);
    }

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
