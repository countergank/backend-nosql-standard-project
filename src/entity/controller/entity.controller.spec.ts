import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Mock } from '../../../test/helpers';
import { CreateEntityResponseDTO } from '../dto/create-entity-response.dto';
import { EntityDTO } from '../dto/entity.dto';
import { Entity } from '../entities/entity.entity';
import {
  EntityEmailAlreadyExistsError,
  EntityNameAlreadyExistsError,
  EntityNotFoundError,
} from '../errors/error-instances.error';
import { CreateEntityDTOMock } from '../mocks/create-entity-dto.mock';
import { EntityMock } from '../mocks/entity.mock';
import { EntityService } from '../service/entity.service';
import { EntityController } from './entity.controller';

describe(EntityController.name, () => {
  let controller: EntityController;
  let entityService: EntityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EntityController],
      providers: [EntityService],
    })
      .useMocker((token) => {
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    controller = module.get<EntityController>(EntityController);
    entityService = module.get<EntityService>(EntityService);
  });

  it(`${EntityController.name} should be defined`, () => {
    expect(controller).toBeDefined();
  });

  describe(`${EntityController.name}.${EntityController.prototype.create.name}`, () => {
    const entity = new EntityMock().randomize();
    const createEntityDTO = new CreateEntityDTOMock().randomize();
    it(`should be create a ${Entity.name}`, async () => {
      jest.spyOn(entityService, 'create').mockResolvedValue(entity);
      await expect(controller.create(createEntityDTO)).resolves.toBeInstanceOf(CreateEntityResponseDTO);
    });
    it(`should return a ${EntityEmailAlreadyExistsError.name}`, async () => {
      jest.spyOn(entityService, 'create').mockRejectedValueOnce(new EntityEmailAlreadyExistsError());
      await expect(controller.create(createEntityDTO)).rejects.toThrow(BadRequestException);
    });
    it(`should return a ${EntityNameAlreadyExistsError.name}`, async () => {
      jest.spyOn(entityService, 'create').mockRejectedValueOnce(new EntityNameAlreadyExistsError());
      await expect(controller.create(createEntityDTO)).rejects.toThrow(BadRequestException);
    });
    it(`should return a ${InternalServerErrorException.name}`, async () => {
      jest.spyOn(entityService, 'create').mockRejectedValueOnce(new Error('Error from test'));
      await expect(controller.create(createEntityDTO)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe(`${EntityController.name}.${EntityController.prototype.findById.name}`, () => {
    const entity = new EntityMock();
    it(`should be return a ${Entity.name}`, async () => {
      jest.spyOn(entityService, 'findById').mockResolvedValue(entity);
      await expect(controller.findById(entity.id)).resolves.toBeInstanceOf(EntityDTO);
    });
    it(`should return a ${EntityNotFoundError.name}`, async () => {
      const entity = new EntityMock();
      jest.spyOn(entityService, 'findById').mockRejectedValueOnce(new EntityNotFoundError());
      await expect(controller.findById(entity.id)).rejects.toThrow(BadRequestException);
    });

    it(`should return a ${InternalServerErrorException.name}`, async () => {
      jest.spyOn(entityService, 'findById').mockRejectedValueOnce(new Error('Error from test'));
      await expect(controller.findById(entity.id)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe(`${EntityController.name}.${EntityController.prototype.findAll.name}`, () => {
    it(`should be return a ${Entity.name}`, async () => {
      jest.spyOn(entityService, 'findAll').mockResolvedValue([new EntityMock()]);
      await expect(controller.findAll()).resolves.toBeInstanceOf(Array<EntityDTO>);
    });
    it(`should return a ${InternalServerErrorException.name}`, async () => {
      jest.spyOn(entityService, 'findAll').mockRejectedValueOnce(new Error('Error from test'));
      await expect(controller.findAll()).rejects.toThrow(InternalServerErrorException);
    });
  });
});
