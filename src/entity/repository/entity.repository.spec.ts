import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';
import { LoggerModule } from 'nestjs-pino';
import { clearMongoCollection, clearMongoConnection, createConnection } from '../../../test/helpers';
import { EncodeService } from '../../encode/encode.service';
import { HashMock } from '../../encode/mocks/hash.mock';
import { Entity, EntitySchema } from '../entities/entity.entity';
import { EntityMock } from '../mocks/entity.mock';
import { EntityRepository } from './entity.repository';

describe(EntityRepository.name, () => {
  let newMongod: MongoMemoryServer;
  let newMongoConnection: Connection;
  let entityModel: Model<Entity>;
  let repository: EntityRepository;
  const encodeService = {
    hash: jest.fn(),
  };

  beforeEach(async () => {
    const { mongod, mongoConnection } = await createConnection();
    newMongod = mongod;
    newMongoConnection = mongoConnection;

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            level: 'silent',
          },
        }),
      ],
      providers: [
        EntityRepository,
        EncodeService,
        {
          provide: getModelToken(Entity.name),
          useValue: entityModel,
        },
      ],
    })
      .overrideProvider(Model<Entity>)
      .useValue(entityModel)
      .compile();

    entityModel = newMongoConnection.model(Entity.name, EntitySchema);
    repository = module.get<EntityRepository>(EntityRepository);
  });

  afterAll(async () => {
    await clearMongoConnection(newMongoConnection, newMongod);
  });

  afterEach(async () => {
    await clearMongoCollection(newMongoConnection);
  });

  it(`${EntityRepository.name} should be defined`, () => {
    expect(repository).toBeDefined();
  });

  describe(`${EntityRepository.name}.${EntityRepository.prototype.create.name}`, () => {
    const entity = new EntityMock();
    it(`should be create a ${Entity.name}`, async () => {
      jest.spyOn(encodeService, 'hash').mockResolvedValue(new HashMock().getMock());
      await expect(repository.create(entity)).resolves.toBeInstanceOf(Model<Entity>);
    });
  });

  describe(`${EntityRepository.name}.${EntityRepository.prototype.existsByEmail.name}`, () => {
    it(`should be return if ${Entity.name} exists by email`, async () => {
      const entity = await repository.create(new EntityMock());
      await expect(repository.existsByEmail(entity.email)).resolves.toBe(true);
    });
  });

  describe(`${EntityRepository.name}.${EntityRepository.prototype.existsByUserName.name}`, () => {
    it(`should be return if ${Entity.name} exists by name`, async () => {
      const entity = await repository.create(new EntityMock());
      await expect(repository.existsByUserName(entity.userName)).resolves.toBe(true);
    });
  });

  describe(`${EntityRepository.name}.${EntityRepository.prototype.findById.name}`, () => {
    it(`should be return a ${Entity.name} by id`, async () => {
      const entity = await repository.create(new EntityMock());
      await expect(repository.findById(entity.id)).resolves.toBeInstanceOf(Model<Entity>);
    });
  });

  describe(`${EntityRepository.name}.${EntityRepository.prototype.findAll.name}`, () => {
    it(`should be return array of ${Entity.name}`, async () => {
      await repository.create(new EntityMock());
      await expect(repository.findAll()).resolves.toBeInstanceOf(Array<Entity[]>);
    });
  });
});
