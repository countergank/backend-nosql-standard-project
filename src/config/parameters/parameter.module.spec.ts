import { DynamicModule, Global, Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitterModule, OnEvent } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { ICACHE_SERVICE, ICacheService } from '../../common/cache/cache.service';
import { ParameterRegistry } from './parameter-registry';
import { ParameterModule } from './parameter.module';
import { ParameterService } from './parameter.service';
import { PARAMETER_CHANGED_EVENT } from './parameter.store';
import { ParameterStore } from './parameter.store';

/**
 * Global infra module mimicking the real app: the global CacheModule provides
 * ICACHE_SERVICE and the global ConfigModule provides ConfigService, both
 * visible to ParameterModule's providers.
 */
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

@Injectable()
class ChangedListener {
  payloads: Array<{ key: string; value: unknown }> = [];

  @OnEvent(PARAMETER_CHANGED_EVENT)
  onChanged(payload: { key: string; value: unknown }): void {
    this.payloads.push(payload);
  }
}

describe('ParameterModule integration', () => {
  let moduleRef: TestingModule;
  let cacheService: jest.Mocked<ICacheService>;
  let configService: { get: jest.Mock };
  let listener: ChangedListener;

  beforeEach(async () => {
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
    };
    configService = { get: jest.fn().mockReturnValue(undefined) };

    const testingModule = Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(), testInfraModule(cacheService, configService), ParameterModule.forRoot()],
      providers: [ChangedListener],
    });
    moduleRef = await testingModule.compile();
    await moduleRef.init();
    listener = moduleRef.get(ChangedListener);
  });

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('should resolve the service, store and registry', () => {
    expect(moduleRef.get(ParameterService)).toBeInstanceOf(ParameterService);
    expect(moduleRef.get(ParameterStore)).toBeInstanceOf(ParameterStore);
    expect(moduleRef.get(ParameterRegistry)).toBeInstanceOf(ParameterRegistry);
  });

  it('should seed the registry with the compiled definitions', () => {
    const registry = moduleRef.get(ParameterRegistry);

    expect(registry.has('ENTITY_CACHE_TTL_MS')).toBe(true);
    expect(registry.getAll()).toHaveLength(1);
  });

  it('should register the static instance on bootstrap', () => {
    expect(ParameterService.instance).toBe(moduleRef.get(ParameterService));
    expect(ParameterService.ensureInitialized()).toBe(moduleRef.get(ParameterService));
  });

  it('should read a value through the full stack (store → cache miss → seed default)', async () => {
    const service = moduleRef.get(ParameterService);

    await expect(service.get('ENTITY_CACHE_TTL_MS')).resolves.toBe(30_000);
    expect(cacheService.set).toHaveBeenCalledWith('param:ENTITY_CACHE_TTL_MS', 30_000, 300_000);
  });

  it('should write a value and emit parameter.changed through the real EventEmitter2', async () => {
    const service = moduleRef.get(ParameterService);

    await service.set('ENTITY_CACHE_TTL_MS', 60_000);

    expect(cacheService.set).toHaveBeenCalledWith('param:ENTITY_CACHE_TTL_MS', 60_000, 300_000);
    expect(listener.payloads).toEqual([{ key: 'ENTITY_CACHE_TTL_MS', value: 60_000 }]);
  });

  it('should resolve values through the admin-facing entry API', async () => {
    const service = moduleRef.get(ParameterService);

    const all = await service.getAll();
    const group = await service.getByGroup('cache');

    expect(all).toHaveLength(1);
    expect(group.map((entry) => entry.key)).toEqual(['ENTITY_CACHE_TTL_MS']);
    expect(all[0]?.value).toBe(30_000);
  });
});
