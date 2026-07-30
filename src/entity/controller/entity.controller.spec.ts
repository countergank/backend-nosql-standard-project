import { Test, TestingModule } from '@nestjs/testing';
import { Mock } from '../../../test/helpers';
import { ICACHE_SERVICE } from '../../common/cache/cache.service';
import { CreateEntityResponseDTO } from '../dto/create-entity-response.dto';
import { EntityDTO } from '../dto/entity.dto';
import { Entity } from '../entities/entity.entity';
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
      providers: [
        EntityService,
        {
          provide: ICACHE_SERVICE,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
            reset: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
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
  });

  describe(`${EntityController.name}.${EntityController.prototype.findById.name}`, () => {
    const entity = new EntityMock();
    it(`should be return a ${Entity.name}`, async () => {
      jest.spyOn(entityService, 'findById').mockResolvedValue(entity);
      await expect(controller.findById(entity.id)).resolves.toBeInstanceOf(EntityDTO);
    });
  });

  describe(`${EntityController.name}.${EntityController.prototype.findAll.name}`, () => {
    it(`should be return a ${Entity.name}`, async () => {
      jest.spyOn(entityService, 'findAll').mockResolvedValue([new EntityMock()]);
      await expect(controller.findAll()).resolves.toBeInstanceOf(Array<EntityDTO>);
    });
  });
});
