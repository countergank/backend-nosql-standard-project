import { EventEmitter2 } from '@nestjs/event-emitter';
import { ICacheService } from '../../common/cache/cache.service';
import { PARAMETER_DEFINITIONS } from './parameter-definitions';
import { ParameterRegistry } from './parameter-registry';
import { PARAMETER_CHANGED_EVENT, ParameterStore } from './parameter.store';

const ENTITY_CACHE_TTL_MS = 'ENTITY_CACHE_TTL_MS';

function buildRegistry(): ParameterRegistry {
  const registry = new ParameterRegistry();
  for (const definition of PARAMETER_DEFINITIONS) {
    registry.register(definition);
  }
  registry.register({
    key: 'FEATURE_FLAG',
    type: 'boolean',
    default: false,
    group: 'features',
    ttl: 60_000,
  });
  registry.register({
    key: 'GREETING',
    type: 'string',
    default: 'hello',
    group: 'misc',
    ttl: 60_000,
  });
  return registry;
}

describe(ParameterStore.name, () => {
  let store: ParameterStore;
  let registry: ParameterRegistry;
  let cacheService: jest.Mocked<ICacheService>;
  let configService: { get: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    registry = buildRegistry();
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
    };
    configService = { get: jest.fn().mockReturnValue(undefined) };
    eventEmitter = { emit: jest.fn() };
    store = new ParameterStore(cacheService, configService as never, registry, eventEmitter as never);
  });

  describe('get — L1 cache', () => {
    it('should return the L1 value on a second read without touching env or the cache service', async () => {
      await store.get(ENTITY_CACHE_TTL_MS); // seeds L1 with the default
      cacheService.get.mockClear();

      await expect(store.get(ENTITY_CACHE_TTL_MS)).resolves.toBe(30_000);
      expect(cacheService.get).not.toHaveBeenCalled();
    });

    it('should treat an expired L1 entry as a miss and re-resolve from the cache service', async () => {
      jest.useFakeTimers();
      try {
        await store.get(ENTITY_CACHE_TTL_MS); // L1 seeded with ttl 300_000
        cacheService.get.mockClear();

        jest.advanceTimersByTime(300_001);
        cacheService.get.mockResolvedValueOnce(42_000);

        await expect(store.get(ENTITY_CACHE_TTL_MS)).resolves.toBe(42_000);
        expect(cacheService.get).toHaveBeenCalledWith(`param:${ENTITY_CACHE_TTL_MS}`);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('get — env override', () => {
    it('should return the coerced env value and cache it in L1', async () => {
      configService.get.mockImplementation((key: string) => (key === ENTITY_CACHE_TTL_MS ? '60000' : undefined));

      await expect(store.get(ENTITY_CACHE_TTL_MS)).resolves.toBe(60_000);
      expect(cacheService.get).not.toHaveBeenCalled();

      // L1 now holds 60000: dropping the env override must not change the value
      configService.get.mockReturnValue(undefined);
      cacheService.get.mockClear();
      await expect(store.get(ENTITY_CACHE_TTL_MS)).resolves.toBe(60_000);
      expect(cacheService.get).not.toHaveBeenCalled();
    });

    it('should coerce boolean env values', async () => {
      configService.get.mockImplementation((key: string) => (key === 'FEATURE_FLAG' ? 'true' : undefined));
      await expect(store.get('FEATURE_FLAG')).resolves.toBe(true);
    });

    it('should keep string env values as strings', async () => {
      configService.get.mockImplementation((key: string) => (key === 'GREETING' ? 'hola' : undefined));
      await expect(store.get('GREETING')).resolves.toBe('hola');
    });

    it('should throw PARAMETER_INVALID_VALUE when a number env value cannot be coerced', async () => {
      configService.get.mockImplementation((key: string) => (key === ENTITY_CACHE_TTL_MS ? 'not-a-number' : undefined));

      await expect(store.get(ENTITY_CACHE_TTL_MS)).rejects.toMatchObject({ kind: 'PARAMETER_INVALID_VALUE' });
    });

    it('should throw PARAMETER_INVALID_VALUE when a boolean env value is not true/false', async () => {
      configService.get.mockImplementation((key: string) => (key === 'FEATURE_FLAG' ? 'maybe' : undefined));

      await expect(store.get('FEATURE_FLAG')).rejects.toMatchObject({ kind: 'PARAMETER_INVALID_VALUE' });
    });
  });

  describe('get — ICACHE_SERVICE delegation (Redis)', () => {
    it('should return a Redis-backed value on L1 miss without env override', async () => {
      cacheService.get.mockResolvedValueOnce(42_000);

      await expect(store.get(ENTITY_CACHE_TTL_MS)).resolves.toBe(42_000);
      expect(cacheService.get).toHaveBeenCalledWith(`param:${ENTITY_CACHE_TTL_MS}`);
    });

    it('should seed the registry default into the cache service on Redis miss (ms TTL, param: prefix)', async () => {
      await expect(store.get(ENTITY_CACHE_TTL_MS)).resolves.toBe(30_000);
      expect(cacheService.set).toHaveBeenCalledWith(`param:${ENTITY_CACHE_TTL_MS}`, 30_000, 300_000);
    });

    it('should fall back to the default when the cache service get throws', async () => {
      cacheService.get.mockRejectedValueOnce(new Error('redis down'));

      await expect(store.get(ENTITY_CACHE_TTL_MS)).resolves.toBe(30_000);
    });
  });

  describe('get — unknown key', () => {
    it('should throw PARAMETER_NOT_FOUND', async () => {
      await expect(store.get('UNKNOWN_KEY')).rejects.toMatchObject({ kind: 'PARAMETER_NOT_FOUND' });
    });
  });

  describe('set', () => {
    it('should write through to the cache service, refresh L1 live and emit parameter.changed', async () => {
      await store.get(ENTITY_CACHE_TTL_MS); // seed L1 with the default
      await store.set(ENTITY_CACHE_TTL_MS, 60_000);

      expect(cacheService.set).toHaveBeenCalledWith(`param:${ENTITY_CACHE_TTL_MS}`, 60_000, 300_000);
      expect(eventEmitter.emit).toHaveBeenCalledWith(PARAMETER_CHANGED_EVENT, {
        key: ENTITY_CACHE_TTL_MS,
        value: 60_000,
      });
      // L1 now holds the new value → live reads without touching the cache service
      cacheService.get.mockClear();
      await expect(store.get(ENTITY_CACHE_TTL_MS)).resolves.toBe(60_000);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(store.getSync(ENTITY_CACHE_TTL_MS)).toBe(60_000);
    });

    it('should coerce string values to the declared type before persisting', async () => {
      await store.set(ENTITY_CACHE_TTL_MS, '45000');

      expect(cacheService.set).toHaveBeenCalledWith(`param:${ENTITY_CACHE_TTL_MS}`, 45_000, 300_000);
      expect(eventEmitter.emit).toHaveBeenCalledWith(PARAMETER_CHANGED_EVENT, {
        key: ENTITY_CACHE_TTL_MS,
        value: 45_000,
      });
    });

    it('should throw PARAMETER_INVALID_VALUE and write nothing for a non-numeric value', async () => {
      await expect(store.set(ENTITY_CACHE_TTL_MS, 'abc')).rejects.toMatchObject({
        kind: 'PARAMETER_INVALID_VALUE',
      });
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should throw PARAMETER_INVALID_VALUE for values rejected by the definition validation', async () => {
      await expect(store.set(ENTITY_CACHE_TTL_MS, -1)).rejects.toMatchObject({
        kind: 'PARAMETER_INVALID_VALUE',
      });
    });

    it('should throw PARAMETER_NOT_FOUND for unknown keys', async () => {
      await expect(store.set('UNKNOWN_KEY', 'x')).rejects.toMatchObject({ kind: 'PARAMETER_NOT_FOUND' });
    });

    it('should throw PARAMETER_ENV_OVERRIDDEN when the parameter is bound to an env var', async () => {
      configService.get.mockImplementation((key: string) => (key === ENTITY_CACHE_TTL_MS ? '60000' : undefined));

      await expect(store.set(ENTITY_CACHE_TTL_MS, 45_000)).rejects.toMatchObject({
        kind: 'PARAMETER_ENV_OVERRIDDEN',
      });
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should degrade gracefully when the cache service set throws', async () => {
      cacheService.set.mockRejectedValueOnce(new Error('redis down'));

      await expect(store.set(ENTITY_CACHE_TTL_MS, 60_000)).resolves.toBeUndefined();
      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    });

    it('should not crash when no EventEmitter is injected', async () => {
      const storeWithoutEmitter = new ParameterStore(cacheService, configService as never, registry, undefined);

      await expect(storeWithoutEmitter.set(ENTITY_CACHE_TTL_MS, 60_000)).resolves.toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete from the cache service and invalidate L1', async () => {
      await store.get(ENTITY_CACHE_TTL_MS); // seed L1
      await store.delete(ENTITY_CACHE_TTL_MS);

      expect(cacheService.del).toHaveBeenCalledWith(`param:${ENTITY_CACHE_TTL_MS}`);
      // L1 invalidated → re-seed from the cache service on next read
      cacheService.get.mockClear();
      await store.get(ENTITY_CACHE_TTL_MS);
      expect(cacheService.get).toHaveBeenCalledWith(`param:${ENTITY_CACHE_TTL_MS}`);
    });

    it('should throw PARAMETER_NOT_FOUND for unknown keys', async () => {
      await expect(store.delete('UNKNOWN_KEY')).rejects.toMatchObject({ kind: 'PARAMETER_NOT_FOUND' });
    });
  });

  describe('getByKeys', () => {
    it('should resolve every requested key', async () => {
      cacheService.get.mockImplementation((key: string) =>
        key === 'param:FEATURE_FLAG' ? Promise.resolve(true) : Promise.resolve(null),
      );

      const result = await store.getByKeys([ENTITY_CACHE_TTL_MS, 'FEATURE_FLAG']);

      expect(result.get(ENTITY_CACHE_TTL_MS)).toBe(30_000);
      expect(result.get('FEATURE_FLAG')).toBe(true);
      expect(result.size).toBe(2);
    });
  });

  describe('has', () => {
    it('should report registration state only', () => {
      expect(store.has(ENTITY_CACHE_TTL_MS)).toBe(true);
      expect(store.has('UNKNOWN_KEY')).toBe(false);
    });
  });

  describe('getSync — constructor injection path', () => {
    it('should resolve L1 → env → default synchronously', () => {
      expect(store.getSync(ENTITY_CACHE_TTL_MS)).toBe(30_000);
    });

    it('should apply the env override synchronously', () => {
      configService.get.mockImplementation((key: string) => (key === ENTITY_CACHE_TTL_MS ? '90000' : undefined));

      expect(store.getSync(ENTITY_CACHE_TTL_MS)).toBe(90_000);
    });

    it('should cache the resolved value in L1 (later env changes are ignored)', () => {
      expect(store.getSync(ENTITY_CACHE_TTL_MS)).toBe(30_000);

      configService.get.mockReturnValue('90000');
      expect(store.getSync(ENTITY_CACHE_TTL_MS)).toBe(30_000);
    });

    it('should return undefined for unknown keys', () => {
      expect(store.getSync('UNKNOWN_KEY')).toBeUndefined();
    });
  });

  describe('isEnvOverridden', () => {
    it('should detect environment-bound parameters', () => {
      configService.get.mockImplementation((key: string) => (key === ENTITY_CACHE_TTL_MS ? '60000' : undefined));

      expect(store.isEnvOverridden(ENTITY_CACHE_TTL_MS)).toBe(true);
      expect(store.isEnvOverridden('FEATURE_FLAG')).toBe(false);
    });
  });
});
