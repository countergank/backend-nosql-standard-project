import { VersioningType } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { validationPipe } from '../src/common/pipes/validation.pipe';

const BASE = '/v1/entity';

async function createApp(): Promise<NestFastifyApplication> {
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

const createEntity = {
  name: 'Leandro',
  lastName: 'Cepeda',
  email: 'leandro@example.com',
  userName: 'leandrojcepeda',
  password: 'secret123',
};

describe('Entity API (e2e)', () => {
  let app: NestFastifyApplication;
  let httpServer: ReturnType<NestFastifyApplication['getHttpServer']>;

  beforeAll(async () => {
    app = await createApp();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /entity/create', () => {
    it('should create an entity and return it', async () => {
      const res = await request(httpServer).post(`${BASE}/create`).send(createEntity).expect(201);

      expect(res.body).toMatchObject({
        name: 'Leandro',
        lastName: 'Cepeda',
        email: 'leandro@example.com',
        userName: 'leandrojcepeda',
      });
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 409 ENTITY_EMAIL_ALREADY_EXISTS for duplicate email', async () => {
      const res = await request(httpServer)
        .post(`${BASE}/create`)
        .send({ ...createEntity, userName: 'otheruser' })
        .expect(409);

      expect(res.body).toMatchObject({ statusCode: 409, code: 'ENTITY_EMAIL_ALREADY_EXISTS' });
    });

    it('should return 409 ENTITY_NAME_ALREADY_EXISTS for duplicate userName', async () => {
      const res = await request(httpServer)
        .post(`${BASE}/create`)
        .send({ ...createEntity, email: 'other@example.com' })
        .expect(409);

      expect(res.body).toMatchObject({ statusCode: 409, code: 'ENTITY_NAME_ALREADY_EXISTS' });
    });

    it('should return 422 for invalid email', async () => {
      const res = await request(httpServer)
        .post(`${BASE}/create`)
        .send({ ...createEntity, email: 'not-an-email' })
        .expect(422);

      expect(res.statusCode).toBe(422);
    });
  });

  describe('GET /entity', () => {
    it('should return all entities', async () => {
      const res = await request(httpServer).get(BASE).expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toMatchObject({ email: 'leandro@example.com' });
    });
  });

  describe('GET /entity/:id', () => {
    it('should return an entity by id', async () => {
      const all = await request(httpServer).get(BASE).expect(200);
      const id = all.body[0].id;

      const res = await request(httpServer).get(`${BASE}/${id}`).expect(200);

      expect(res.body).toMatchObject({ id, email: 'leandro@example.com' });
    });

    it('should return 404 ENTITY_NOT_FOUND for unknown id', async () => {
      const res = await request(httpServer).get(`${BASE}/000000000000000000000000`).expect(404);

      expect(res.body).toMatchObject({ statusCode: 404, code: 'ENTITY_NOT_FOUND' });
    });
  });
});
