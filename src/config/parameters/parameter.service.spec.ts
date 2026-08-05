import { PARAMETER_DEFINITIONS } from './parameter-definitions';
import { ParameterRegistry } from './parameter-registry';
import { ParameterService } from './parameter.service';
import { ParameterStore } from './parameter.store';

const ENTITY_CACHE_TTL_MS = 'ENTITY_CACHE_TTL_MS';

describe(ParameterService.name, () => {
  let service: ParameterService;
  let store: jest.Mocked<ParameterStore>;
  let registry: ParameterRegistry;

  beforeEach(() => {
    registry = new ParameterRegistry();
    for (const definition of PARAMETER_DEFINITIONS) {
      registry.register(definition);
    }

    store = {
      get: jest.fn().mockImplementation(async (key: string) => registry.find(key)?.default),
      set: jest.fn().mockResolvedValue(undefined),
      getByKeys: jest.fn().mockResolvedValue(new Map()),
      has: jest.fn().mockImplementation((key: string) => registry.has(key)),
      delete: jest.fn().mockResolvedValue(undefined),
      getSync: jest.fn(),
      isEnvOverridden: jest.fn().mockReturnValue(false),
      getEntry: jest.fn(),
    } as never;

    service = new ParameterService(store as never, registry);
    ParameterService.instance = null;
  });

  describe('delegation', () => {
    it('should delegate get to the store', async () => {
      store.get.mockResolvedValueOnce(42_000);

      await expect(service.get(ENTITY_CACHE_TTL_MS)).resolves.toBe(42_000);
      expect(store.get).toHaveBeenCalledWith(ENTITY_CACHE_TTL_MS);
    });

    it('should delegate set to the store', async () => {
      await service.set(ENTITY_CACHE_TTL_MS, 60_000);

      expect(store.set).toHaveBeenCalledWith(ENTITY_CACHE_TTL_MS, 60_000);
    });

    it('should delegate delete to the store', async () => {
      await service.delete(ENTITY_CACHE_TTL_MS);

      expect(store.delete).toHaveBeenCalledWith(ENTITY_CACHE_TTL_MS);
    });

    it('should delegate has to the store', () => {
      expect(service.has('UNKNOWN_KEY')).toBe(false);
      expect(store.has).toHaveBeenCalledWith('UNKNOWN_KEY');
    });
  });

  describe('getAll / getByGroup / getEntry', () => {
    it('should return one entry per registered definition with resolved values', async () => {
      const entries = await service.getAll();

      expect(entries).toHaveLength(PARAMETER_DEFINITIONS.length);
      expect(entries).toContainEqual(
        expect.objectContaining({
          key: ENTITY_CACHE_TTL_MS,
          type: 'number',
          group: 'cache',
          value: 30_000,
          isOverridden: false,
        }),
      );
      expect(store.get).toHaveBeenCalledWith(ENTITY_CACHE_TTL_MS);
    });

    it('should filter entries by group', async () => {
      const entries = await service.getByGroup('cache');

      expect(entries.map((entry) => entry.key)).toEqual([ENTITY_CACHE_TTL_MS]);
    });

    it('should return an empty list for an unknown group', async () => {
      await expect(service.getByGroup('nope')).resolves.toEqual([]);
    });

    it('should build a single entry by key', async () => {
      const entry = await service.getEntry(ENTITY_CACHE_TTL_MS);

      expect(entry).toMatchObject({ key: ENTITY_CACHE_TTL_MS, value: 30_000, group: 'cache' });
    });

    it('should return undefined for an unknown key', async () => {
      await expect(service.getEntry('UNKNOWN_KEY')).resolves.toBeUndefined();
    });

    it('should report isOverridden from the store', async () => {
      store.isEnvOverridden.mockReturnValueOnce(true);

      const [entry] = await service.getAll();

      expect(entry?.isOverridden).toBe(true);
    });
  });

  describe('static instance holder (decorator path)', () => {
    it('should throw when ensureInitialized is called before bootstrap', () => {
      expect(() => ParameterService.ensureInitialized()).toThrow(/not initialized/i);
    });

    it('should register the instance on bootstrap', () => {
      service.onApplicationBootstrap();

      expect(ParameterService.instance).toBe(service);
      expect(ParameterService.ensureInitialized()).toBe(service);
    });

    it('should expose the instance after bootstrap', () => {
      service.onApplicationBootstrap();

      expect(ParameterService.instance).not.toBeNull();
    });
  });
});
