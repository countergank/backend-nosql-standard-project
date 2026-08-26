import { VersioningType } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';

async function createApp(): Promise<NestFastifyApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.enableVersioning({ type: VersioningType.URI });
  await app.init();
  await app.listen(0);
  return app;
}

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;
  let httpServer: ReturnType<NestFastifyApplication['getHttpServer']>;

  beforeAll(async () => {
    app = await createApp();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET version)', async () => {
    const res = await request(httpServer).get('/').expect(200);

    expect(res.body).toHaveProperty('version');
  });

  it('/health (GET health check)', async () => {
    const res = await request(httpServer).get('/health').expect(200);

    expect(res.body).toMatchObject({ status: 'ok' });
    expect(res.body).toHaveProperty('services');
    expect(res.body.services).toHaveProperty('mongodb');
  });

  it('/message-microservice/:pattern (POST disabled microservice)', async () => {
    const res = await request(httpServer).post('/message-microservice/test-pattern').send({ data: 'test' }).expect(500);

    expect(res.body).toMatchObject({ statusCode: 500, code: 'APP_ERROR' });
  });
});
