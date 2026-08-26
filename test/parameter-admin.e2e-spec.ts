import { VersioningType } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { validationPipe } from '../src/common/pipes/validation.pipe';
import { PARAMETER_CHANGED_EVENT } from '../src/config/parameters/parameter.store';

const ADMIN_TOKEN = 'e2e-admin-token';
const ENTITY_CACHE_TTL_MS = 'ENTITY_CACHE_TTL_MS';
const BASE = '/v1/admin/parameters';

async function createApp(): Promise<NestFastifyApplication> {
  process.env.ADMIN_API_TOKEN = ADMIN_TOKEN;

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(validationPipe);
  await app.init();
  await app.listen(0);
  return app;
}

describe('Parameter Admin API (e2e)', () => {
  let app: NestFastifyApplication;
  let httpServer: ReturnType<NestFastifyApplication['getHttpServer']>;

  beforeAll(async () => {
    // biome-ignore lint/performance/noDelete: need to clear env for clean test state
    delete process.env.ENTITY_CACHE_TTL_MS;
    app = await createApp();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    // biome-ignore lint/performance/noDelete: need to clear env for clean test state
    delete process.env.ADMIN_API_TOKEN;
    // biome-ignore lint/performance/noDelete: need to clear env for clean test state
    delete process.env.ENTITY_CACHE_TTL_MS;
    await app.close();
  });

  describe('authorization', () => {
    it('should reject a request without x-admin-token with 401 + WWW-Authenticate', async () => {
      const res = await request(httpServer).get(BASE).expect(401);

      expect(res.headers['www-authenticate']).toBe('Bearer realm="admin"');
      expect(res.body).toMatchObject({ statusCode: 401, code: 'UA-HTTP-401' });
    });

    it('should reject a request with an invalid x-admin-token', async () => {
      const res = await request(httpServer).get(BASE).set('x-admin-token', 'wrong').expect(401);

      expect(res.headers['www-authenticate']).toBe('Bearer realm="admin"');
    });
  });

  describe('GET /v1/admin/parameters', () => {
    it('should return all parameters with metadata', async () => {
      const res = await request(httpServer).get(BASE).set('x-admin-token', ADMIN_TOKEN).expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toContainEqual(
        expect.objectContaining({
          key: ENTITY_CACHE_TTL_MS,
          value: 30_000,
          type: 'number',
          group: 'cache',
          isOverridden: false,
        }),
      );
    });
  });

  describe('GET /v1/admin/parameters/:group', () => {
    it('should return only the parameters of the requested group', async () => {
      const res = await request(httpServer).get(`${BASE}/cache`).set('x-admin-token', ADMIN_TOKEN).expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ key: ENTITY_CACHE_TTL_MS, group: 'cache' });
    });
  });

  describe('PUT /v1/admin/parameters/:key', () => {
    it('should update the parameter, emit parameter.changed and return the refreshed entry', async () => {
      const emitter = app.get(EventEmitter2);
      const payloads: Array<{ key: string; value: unknown }> = [];
      emitter.on(PARAMETER_CHANGED_EVENT, (payload: { key: string; value: unknown }) => payloads.push(payload));

      const res = await request(httpServer)
        .put(`${BASE}/${ENTITY_CACHE_TTL_MS}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ value: '60000' })
        .expect(200);

      expect(res.body).toMatchObject({ key: ENTITY_CACHE_TTL_MS, value: 60_000, type: 'number' });
      expect(payloads).toContainEqual({ key: ENTITY_CACHE_TTL_MS, value: 60_000 });

      // restore the default so later runs start clean
      await request(httpServer)
        .put(`${BASE}/${ENTITY_CACHE_TTL_MS}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ value: '30000' })
        .expect(200);
    });

    it('should return 404 PARAMETER_NOT_FOUND for an unknown key', async () => {
      const res = await request(httpServer)
        .put(`${BASE}/NONEXISTENT_KEY`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ value: '1' })
        .expect(404);

      expect(res.body).toMatchObject({ statusCode: 404, code: 'PARAMETER_NOT_FOUND' });
    });

    it('should return 422 PARAMETER_INVALID_VALUE for a non-numeric value', async () => {
      const res = await request(httpServer)
        .put(`${BASE}/${ENTITY_CACHE_TTL_MS}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ value: 'abc' })
        .expect(422);

      expect(res.body).toMatchObject({ statusCode: 422, code: 'PARAMETER_INVALID_VALUE' });
    });

    it('should return 422 PARAMETER_INVALID_VALUE for a negative value', async () => {
      const res = await request(httpServer)
        .put(`${BASE}/${ENTITY_CACHE_TTL_MS}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ value: -1 })
        .expect(422);

      expect(res.body).toMatchObject({ statusCode: 422, code: 'PARAMETER_INVALID_VALUE' });
    });
  });
});

describe('Parameter Admin API — env-bound parameter (e2e)', () => {
  let app: NestFastifyApplication;
  let httpServer: ReturnType<NestFastifyApplication['getHttpServer']>;

  beforeAll(async () => {
    process.env.ENTITY_CACHE_TTL_MS = '50000';
    app = await createApp();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    // biome-ignore lint/performance/noDelete: need to clear env for clean test state
    delete process.env.ADMIN_API_TOKEN;
    // biome-ignore lint/performance/noDelete: need to clear env for clean test state
    delete process.env.ENTITY_CACHE_TTL_MS;
    await app.close();
  });

  it('should expose the env override value via GET', async () => {
    const res = await request(httpServer).get(BASE).set('x-admin-token', ADMIN_TOKEN).expect(200);

    expect(res.body).toContainEqual(
      expect.objectContaining({ key: ENTITY_CACHE_TTL_MS, value: 50_000, isOverridden: true }),
    );
  });

  it('should reject updates of an env-bound parameter with 409 PARAMETER_ENV_OVERRIDDEN', async () => {
    const res = await request(httpServer)
      .put(`${BASE}/${ENTITY_CACHE_TTL_MS}`)
      .set('x-admin-token', ADMIN_TOKEN)
      .send({ value: '60000' })
      .expect(409);

    expect(res.body).toMatchObject({ statusCode: 409, code: 'PARAMETER_ENV_OVERRIDDEN' });
  });
});
