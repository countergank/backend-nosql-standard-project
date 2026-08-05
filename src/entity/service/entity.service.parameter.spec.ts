import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { ICACHE_SERVICE, ICacheService } from '../../common/cache/cache.service';
import { ParameterModule } from '../../config/parameters/parameter.module';
import { ParameterService } from '../../config/parameters/parameter.service';
import { Entity } from '../entities/entity.entity';
import { EntityMock } from '../mocks/entity.mock';
import { EntityRepository } from '../repository/entity.repository';
import { EntityService } from './entity.service';

/** Global infra module mimicking the real app (global CacheModule + ConfigModule). */
function testInfraModule(cacheService: jest.Mocked<ICacheService>, configService: { get: jest.Mock }): DynamicModule {
  @Global()
  @Module({
    providers: [
      { provide: ICACHE_SERVICE, useValue: cacheService },
      { provide: ConfigService, useValue: configService },
    ],
    exports: [ICACHE_SERVICE, ConfigService],
  })
  class TestInfraModule {}

  return TestInfraModule as never;
}

describe(`${EntityService.name} — @Parameter integration`, () => {
  let moduleRef: TestingModule;
  let service: EntityService;
  let parameterService: ParameterService;
  let cacheService: jest.Mocked<ICacheService>;
  const entityRepository = { findAll: jest.fn() };

  async function compile(withDefinitions: boolean): Promise<void> {
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
    };

    moduleRef = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        testInfraModule(cacheService, { get: jest.fn().mockReturnValue(undefined) }),
        ParameterModule.forRoot(withDefinitions ? undefined : []),
      ],
      providers: [{ provide: EntityRepository, useValue: entityRepository }, EntityService],
    }).compile();
    await moduleRef.init();
    service = moduleRef.get(EntityService);
    parameterService = moduleRef.get(ParameterService);
  }

  beforeEach(async () => {
    await compile(true);
  });

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
    ParameterService.instance = null;
  });

  it('should cache entity list reads with the parameterized TTL (default 30000)', async () => {
    entityRepository.findAll.mockResolvedValue([new EntityMock()]);

    const result = await service.findAll();

    expect(result).toBeInstanceOf(Array<Entity>);
    expect(cacheService.set).toHaveBeenCalledWith('entity:all', expect.any(Array), 30_000);
  });

  it('should use the updated TTL on subsequent cache operations after a runtime update', async () => {
    entityRepository.findAll.mockResolvedValue([new EntityMock()]);
    await service.findAll();
    expect(cacheService.set).toHaveBeenLastCalledWith('entity:all', expect.any(Array), 30_000);

    await parameterService.set('ENTITY_CACHE_TTL_MS', 60_000);
    cacheService.set.mockClear();
    await service.findAll();

    expect(cacheService.set).toHaveBeenLastCalledWith('entity:all', expect.any(Array), 60_000);
  });

  it('should fall back to 30000 when the parameter is not registered', async () => {
    await moduleRef.close();
    await compile(false);
    entityRepository.findAll.mockResolvedValue([new EntityMock()]);

    await service.findAll();

    expect(cacheService.set).toHaveBeenLastCalledWith('entity:all', expect.any(Array), 30_000);
  });
});
