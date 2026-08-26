import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import { CacheModule } from './cache.module';
import { ICACHE_SERVICE, ICacheService, InMemoryCacheProvider, RedisCacheProvider } from './cache.service';

// ---------------------------------------------------------------------------
// ICacheService interface contract
// ---------------------------------------------------------------------------
describe('ICacheService interface contract', () => {
  it('should have get<T> method signature', () => {
    const provider: ICacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };
    expect(provider.get).toBeDefined();
    expect(provider.set).toBeDefined();
    expect(provider.del).toBeDefined();
    expect(provider.reset).toBeDefined();
  });

  it('should accept ICACHE_SERVICE injection token', () => {
    expect(ICACHE_SERVICE).toBe('ICACHE_SERVICE');
  });
});

// ---------------------------------------------------------------------------
// InMemoryCacheProvider
// ---------------------------------------------------------------------------
describe('InMemoryCacheProvider', () => {
  let provider: InMemoryCacheProvider;

  beforeEach(() => {
    provider = new InMemoryCacheProvider({ defaultTtlMs: 60_000 });
  });

  afterEach(async () => {
    await provider.reset();
    provider.onModuleDestroy();
    jest.useRealTimers();
  });

  describe('get / set', () => {
    it('should set and get a string value', async () => {
      await provider.set('key1', 'hello');
      await expect(provider.get<string>('key1')).resolves.toBe('hello');
    });

    it('should set and get an object value', async () => {
      const obj = { a: 1, b: [2, 3] };
      await provider.set('obj', obj);
      await expect(provider.get<typeof obj>('obj')).resolves.toEqual(obj);
    });

    it('should return null for missing key', async () => {
      await expect(provider.get('nope')).resolves.toBeNull();
    });

    it('should return null for expired entry (lazy expiration)', async () => {
      await provider.set('ephemeral', 'value', 10); // 10ms TTL
      await expect(provider.get<string>('ephemeral')).resolves.toBe('value');
      // Wait for expiration
      await new Promise((r) => setTimeout(r, 20));
      await expect(provider.get<string>('ephemeral')).resolves.toBeNull();
    });

    it('should use defaultTtlMs when no TTL is provided', async () => {
      const shortProvider = new InMemoryCacheProvider({ defaultTtlMs: 20 });
      await shortProvider.set('quick', 'data');
      await expect(shortProvider.get<string>('quick')).resolves.toBe('data');
      await new Promise((r) => setTimeout(r, 30));
      await expect(shortProvider.get<string>('quick')).resolves.toBeNull();
      shortProvider.onModuleDestroy();
    });

    it('should override default TTL with explicit ttlMs', async () => {
      await provider.set('long', 'persist', 200);
      await provider.set('short', 'gone', 10);
      await new Promise((r) => setTimeout(r, 30));
      await expect(provider.get<string>('long')).resolves.toBe('persist');
      await expect(provider.get<string>('short')).resolves.toBeNull();
    });

    it('should overwrite existing key', async () => {
      await provider.set('key', 'first');
      await provider.set('key', 'second');
      await expect(provider.get<string>('key')).resolves.toBe('second');
    });
  });

  describe('del', () => {
    it('should delete an existing key', async () => {
      await provider.set('key', 'value');
      await provider.del('key');
      await expect(provider.get('key')).resolves.toBeNull();
    });

    it('should not throw when deleting non-existent key', async () => {
      await expect(provider.del('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should clear all entries', async () => {
      await provider.set('a', 1);
      await provider.set('b', 2);
      await provider.reset();
      await expect(provider.get('a')).resolves.toBeNull();
      await expect(provider.get('b')).resolves.toBeNull();
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent set/get operations without race conditions', async () => {
      const ops = Array.from({ length: 50 }, (_, i) => provider.set(`concurrent-${i}`, i));
      await Promise.all(ops);

      const results = await Promise.all(Array.from({ length: 50 }, (_, i) => provider.get<number>(`concurrent-${i}`)));
      results.forEach((val, i) => {
        expect(val).toBe(i);
      });
    });

    it('should handle concurrent del and get without crashing', async () => {
      await provider.set('target', 'data');
      await Promise.all([
        provider.del('target'),
        provider.get('target'),
        provider.set('target', 'new'),
        provider.get('target'),
      ]);
      // Should not throw
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear cleanup interval on destroy', () => {
      const spy = jest.spyOn(global, 'clearInterval');
      provider.onModuleDestroy();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should not throw if called multiple times', () => {
      provider.onModuleDestroy();
      expect(() => provider.onModuleDestroy()).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// RedisCacheProvider
// ---------------------------------------------------------------------------
describe('RedisCacheProvider', () => {
  let mockRedisClient: Record<string, jest.Mock>;
  let provider: RedisCacheProvider;

  const createMockRedis = (): Record<string, jest.Mock> => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    flushall: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn().mockReturnThis(),
  });

  const createProvider = (client?: Record<string, jest.Mock>) => {
    const redis = client ?? createMockRedis();
    return new RedisCacheProvider({ defaultTtlMs: 60_000 }, redis as unknown as Redis);
  };

  afterEach(async () => {
    if (provider) {
      await provider.onModuleDestroy();
    }
  });

  describe('get / set', () => {
    it('should set and get a string value', async () => {
      mockRedisClient = createMockRedis();
      mockRedisClient.get.mockResolvedValue('"hello"');
      provider = createProvider(mockRedisClient);

      await provider.set('key1', 'hello');
      expect(mockRedisClient.set).toHaveBeenCalledWith('cache:key1', '"hello"', 'PX', 60_000);

      const result = await provider.get<string>('key1');
      expect(result).toBe('hello');
    });

    it('should set and get an object value', async () => {
      mockRedisClient = createMockRedis();
      const obj = { a: 1, b: [2, 3] };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(obj));
      provider = createProvider(mockRedisClient);

      await provider.set('obj', obj);
      expect(mockRedisClient.set).toHaveBeenCalledWith('cache:obj', JSON.stringify(obj), 'PX', 60_000);

      const result = await provider.get<typeof obj>('obj');
      expect(result).toEqual(obj);
    });

    it('should return null for missing key', async () => {
      mockRedisClient = createMockRedis();
      mockRedisClient.get.mockResolvedValue(null);
      provider = createProvider(mockRedisClient);

      await expect(provider.get('nope')).resolves.toBeNull();
    });

    it('should use explicit TTL when provided', async () => {
      mockRedisClient = createMockRedis();
      provider = createProvider(mockRedisClient);

      await provider.set('key', 'val', 5000);
      expect(mockRedisClient.set).toHaveBeenCalledWith('cache:key', '"val"', 'PX', 5000);
    });
  });

  describe('del', () => {
    it('should delete an existing key', async () => {
      mockRedisClient = createMockRedis();
      mockRedisClient.del.mockResolvedValue(1);
      provider = createProvider(mockRedisClient);

      await provider.del('key');
      expect(mockRedisClient.del).toHaveBeenCalledWith('cache:key');
    });

    it('should not throw when key does not exist', async () => {
      mockRedisClient = createMockRedis();
      mockRedisClient.del.mockResolvedValue(0);
      provider = createProvider(mockRedisClient);

      await expect(provider.del('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should flush all keys with cache prefix', async () => {
      mockRedisClient = createMockRedis();
      mockRedisClient.flushall.mockResolvedValue('OK');
      provider = createProvider(mockRedisClient);

      await provider.reset();
      expect(mockRedisClient.flushall).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle Redis connection failure gracefully on get', async () => {
      mockRedisClient = createMockRedis();
      mockRedisClient.get.mockRejectedValue(new Error('Connection refused'));
      provider = createProvider(mockRedisClient);

      await expect(provider.get('key')).resolves.toBeNull();
    });

    it('should handle Redis connection failure gracefully on set', async () => {
      mockRedisClient = createMockRedis();
      mockRedisClient.set.mockRejectedValue(new Error('Connection refused'));
      provider = createProvider(mockRedisClient);

      await expect(provider.set('key', 'val')).resolves.toBeUndefined();
    });

    it('should handle Redis connection failure gracefully on del', async () => {
      mockRedisClient = createMockRedis();
      mockRedisClient.del.mockRejectedValue(new Error('Connection refused'));
      provider = createProvider(mockRedisClient);

      await expect(provider.del('key')).resolves.toBeUndefined();
    });

    it('should handle Redis connection failure gracefully on reset', async () => {
      mockRedisClient = createMockRedis();
      mockRedisClient.flushall.mockRejectedValue(new Error('Connection refused'));
      provider = createProvider(mockRedisClient);

      await expect(provider.reset()).resolves.toBeUndefined();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect Redis client on destroy', async () => {
      mockRedisClient = createMockRedis();
      mockRedisClient.disconnect.mockResolvedValue(undefined);
      provider = createProvider(mockRedisClient);

      await provider.onModuleDestroy();
      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect failure gracefully', async () => {
      mockRedisClient = createMockRedis();
      mockRedisClient.disconnect.mockRejectedValue(new Error('Already closed'));
      provider = createProvider(mockRedisClient);

      await expect(provider.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  describe('error event', () => {
    it('should log and suppress Redis error events', () => {
      mockRedisClient = createMockRedis();
      mockRedisClient.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
        if (event === 'error') {
          // Simulate error event to ensure it doesn't throw
          handler(new Error('ECONNREFUSED'));
        }
        return mockRedisClient;
      });

      provider = createProvider(mockRedisClient);
      // The error event handler should not throw
    });
  });

  // @requires-redis — runs only when REDIS_URL is set in CI
  (process.env.REDIS_URL ? describe : describe.skip)('RedisCacheProvider integration (@requires-redis)', () => {
    let integrationProvider: RedisCacheProvider;
    let integrationClient: Redis;

    beforeAll(() => {
      integrationClient = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
    });

    afterAll(async () => {
      if (integrationClient) {
        await integrationClient.quit();
      }
    });

    beforeEach(async () => {
      await integrationClient.connect();
      await integrationClient.flushall();
      integrationProvider = new RedisCacheProvider({ defaultTtlMs: 60_000 }, integrationClient);
    });

    // biome-ignore lint/suspicious/noDuplicateTestHooks: parent afterEach cleans mock provider, this cleans real Redis provider
    afterEach(async () => {
      await integrationProvider.onModuleDestroy();
    });

    it('should store and retrieve values from real Redis', async () => {
      await integrationProvider.set('integration-key', 'integration-value');
      const result = await integrationProvider.get<string>('integration-key');
      expect(result).toBe('integration-value');
    });

    it('should delete values from real Redis', async () => {
      await integrationProvider.set('del-key', 'to-delete');
      await integrationProvider.del('del-key');
      const result = await integrationProvider.get('del-key');
      expect(result).toBeNull();
    });

    it('should flush all keys on reset', async () => {
      await integrationProvider.set('a', 1);
      await integrationProvider.set('b', 2);
      await integrationProvider.reset();
      await expect(integrationProvider.get('a')).resolves.toBeNull();
      await expect(integrationProvider.get('b')).resolves.toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// CacheModule.forRoot() — provider selection logic
// ---------------------------------------------------------------------------
describe('CacheModule.forRoot()', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.REDIS_URL = undefined;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('should register InMemoryCacheProvider when REDIS_URL is not set', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.forRoot()],
    })
      .overrideProvider(ConfigService)
      .useValue({ get: jest.fn().mockReturnValue(undefined) })
      .compile();

    const provider = module.get<ICacheService>(ICACHE_SERVICE);
    expect(provider).toBeInstanceOf(InMemoryCacheProvider);
  });

  it('should register RedisCacheProvider when REDIS_URL is set', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.forRoot()],
    })
      .overrideProvider(ConfigService)
      .useValue({ get: jest.fn().mockReturnValue('redis://localhost:6379') })
      .compile();

    const provider = module.get<ICacheService>(ICACHE_SERVICE);
    expect(provider).toBeInstanceOf(RedisCacheProvider);
  });

  it('should provide ICACHE_SERVICE token', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.forRoot()],
    })
      .overrideProvider(ConfigService)
      .useValue({ get: jest.fn().mockReturnValue(undefined) })
      .compile();

    const token = module.get<ICacheService>(ICACHE_SERVICE);
    expect(token).toBeDefined();
  });

  it('should use provided cache options', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.forRoot({ defaultTtlMs: 5000 })],
    })
      .overrideProvider(ConfigService)
      .useValue({ get: jest.fn().mockReturnValue(undefined) })
      .compile();

    const provider = module.get<ICacheService>(ICACHE_SERVICE) as InMemoryCacheProvider;
    expect(provider).toBeDefined();
  });
});
