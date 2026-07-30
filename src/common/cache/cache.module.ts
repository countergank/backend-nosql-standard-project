import { DynamicModule, Logger, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  CACHE_OPTIONS,
  CacheOptions,
  ICACHE_SERVICE,
  InMemoryCacheProvider,
  RedisCacheProvider,
} from './cache.service';

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS dynamic module pattern requires static forRoot()
export class CacheModule {
  private static readonly logger = new Logger(CacheModule.name);

  /**
   * Register the cache module.
   *
   * Provider selection:
   * - `REDIS_URL` env var present  → RedisCacheProvider (requires ioredis)
   * - otherwise                    → InMemoryCacheProvider (zero deps)
   */
  static forRoot(options?: CacheOptions): DynamicModule {
    const cacheOptionsProvider: Provider = {
      provide: CACHE_OPTIONS,
      useValue: options ?? {},
    };

    const cacheServiceProvider: Provider = {
      provide: ICACHE_SERVICE,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (redisUrl) {
          CacheModule.logger.log('Redis URL detected — using RedisCacheProvider');
          const client = new Redis(redisUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null, // fail fast
          });
          client.connect().catch(() => {}); // fire-and-forget
          return new RedisCacheProvider(options ?? {}, client);
        }

        CacheModule.logger.log('No REDIS_URL — using InMemoryCacheProvider');
        return new InMemoryCacheProvider(options ?? {});
      },
      inject: [ConfigService],
    };

    return {
      module: CacheModule,
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true })],
      providers: [cacheOptionsProvider, cacheServiceProvider],
      exports: [ICACHE_SERVICE],
      global: true,
    };
  }
}
