import { Controller, Get, HttpException, HttpStatus, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from 'nestjs-pino';
import request from 'supertest';
import { DomainError } from '../errors/domain.error';
import { TraceIdMiddleware } from '../middleware/trace-id.middleware';
import { AllExceptionsFilter } from './all-exceptions.filter';

@Controller('test')
class TestErrorController {
  @Get('not-found')
  throwEntityNotFound(): void {
    throw DomainError.fromKind('ENTITY_NOT_FOUND');
  }

  @Get('http-error')
  throwHttpError(): void {
    throw new HttpException('Custom HTTP error', HttpStatus.BAD_REQUEST);
  }

  @Get('unknown-error')
  throwUnknown(): void {
    throw new Error('Something unexpected');
  }

  @Get('success')
  returnSuccess(): { ok: boolean } {
    return { ok: true };
  }
}

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: 'silent',
      },
    }),
  ],
  controllers: [TestErrorController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
class TestErrorModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceIdMiddleware).forRoutes('*');
  }
}

describe('Error Handling Integration', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestErrorModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ genReqId: () => 'test-integration-trace-id' }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('ErrorResponseDto envelope', () => {
    it('should return 404 envelope for DomainError', async () => {
      const response = await request(app.getHttpServer()).get('/test/not-found');

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: expect.any(String),
        code: 'ENTITY_NOT_FOUND',
        traceId: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should return 400 envelope for HttpException', async () => {
      const response = await request(app.getHttpServer()).get('/test/http-error');

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Custom HTTP error',
        traceId: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should return 500 envelope for unknown errors', async () => {
      const response = await request(app.getHttpServer()).get('/test/unknown-error');

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toMatchObject({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        traceId: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should not affect success responses', async () => {
      const response = await request(app.getHttpServer()).get('/test/success');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({ ok: true });
    });
  });

  describe('Trace ID propagation', () => {
    it('should include x-trace-id header in error responses', async () => {
      const response = await request(app.getHttpServer()).get('/test/not-found');

      expect(response.headers['x-trace-id']).toBe('test-integration-trace-id');
    });

    it('should include x-trace-id header in success responses', async () => {
      const response = await request(app.getHttpServer()).get('/test/success');

      expect(response.headers['x-trace-id']).toBe('test-integration-trace-id');
    });
  });
});
