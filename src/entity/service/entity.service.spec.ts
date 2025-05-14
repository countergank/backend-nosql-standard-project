import { Test, TestingModule } from '@nestjs/testing';
import { Mock } from '../../../test/helpers';
import { Entity } from '../entities/entity.entity';
import {
  EntityEmailAlreadyExistsError,
  EntityNameAlreadyExistsError,
  EntityNotFoundError,
} from '../errors/error-instances.error';
import { CreateEntityDTOMock } from '../mocks/create-entity-dto.mock';
import { EntityMock } from '../mocks/entity.mock';
import { EntityRepository } from '../repository/entity.repository';
import { EntityService } from './entity.service';

describe(EntityService.name, () => {
  let service: EntityService;
  const entityRepository = {
    existsByName: jest.fn(),
    existsByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntityService, EntityRepository],
    })
      .overrideProvider(EntityRepository)
      .useValue(entityRepository)
      .useMocker((token) => {
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    service = module.get<EntityService>(EntityService);
  });

  it(`${EntityService.name} should be defined`, () => {
    expect(service).toBeDefined();
  });

  describe(`${EntityService.name}.${EntityService.prototype.create.name}`, () => {
    const createDto = new CreateEntityDTOMock();
    const entity = new EntityMock();
    it(`should be create a ${Entity.name}`, async () => {
      jest.spyOn(entityRepository, 'existsByName').mockResolvedValue(false);
      jest.spyOn(entityRepository, 'existsByEmail').mockResolvedValue(false);
      jest.spyOn(entityRepository, 'create').mockResolvedValue(entity);
      await expect(service.create(createDto)).resolves.toBeInstanceOf(Entity);
    });
    it(`should return a ${EntityEmailAlreadyExistsError.name}`, async () => {
      jest.spyOn(entityRepository, 'existsByName').mockResolvedValue(false);
      jest.spyOn(entityRepository, 'existsByEmail').mockResolvedValue(true);
      await expect(service.create(createDto)).rejects.toBeInstanceOf(EntityEmailAlreadyExistsError);
    });
    it(`should return a ${EntityNameAlreadyExistsError.name}`, async () => {
      jest.spyOn(entityRepository, 'existsByName').mockResolvedValue(true);
      jest.spyOn(entityRepository, 'existsByEmail').mockResolvedValue(false);
      await expect(service.create(createDto)).rejects.toBeInstanceOf(EntityNameAlreadyExistsError);
    });
  });

  describe(`${EntityService.name}.${EntityService.prototype.findAll.name}`, () => {
    const entity = new EntityMock();
    it(`should be return a array of ${Entity.name}`, async () => {
      jest.spyOn(entityRepository, 'findAll').mockResolvedValue([entity]);
      await expect(service.findAll()).resolves.toBeInstanceOf(Array<Entity>);
    });
  });

  describe(`${EntityService.name}.${EntityService.prototype.findById.name}`, () => {
    const entity = new EntityMock();
    it(`should be return a ${Entity.name} by Id`, async () => {
      jest.spyOn(entityRepository, 'findById').mockResolvedValue(entity);
      await expect(service.findById(entity.id)).resolves.toBeInstanceOf(Entity);
    });
    it(`should return a ${EntityNotFoundError.name}`, async () => {
      jest.spyOn(entityRepository, 'findById').mockResolvedValue(undefined);
      await expect(service.findById(entity.id)).rejects.toBeInstanceOf(EntityNotFoundError);
    });
  });
});
