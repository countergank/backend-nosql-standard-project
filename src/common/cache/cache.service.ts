import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------
export const ICACHE_SERVICE = 'ICACHE_SERVICE';
export const CACHE_OPTIONS = 'CACHE_OPTIONS';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  reset(): Promise<void>;
}

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number; // epoch ms
}

export interface CacheOptions {
  defaultTtlMs?: number;
}

// ---------------------------------------------------------------------------
// InMemoryCacheProvider
// ---------------------------------------------------------------------------
@Injectable()
export class InMemoryCacheProvider implements ICacheService, OnModuleDestroy {
  private readonly logger = new Logger(InMemoryCacheProvider.name);
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly cleanupIntervalMs = 30_000; // sweep every 30s

  constructor(@Inject(CACHE_OPTIONS) options: CacheOptions = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? 60_000;
    this.startCleanupInterval();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const ttl = ttlMs ?? this.defaultTtlMs;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async reset(): Promise<void> {
    this.store.clear();
  }

  onModuleDestroy(): void {
    this.stopCleanupInterval();
  }

  // -- internal helpers ---------------------------------------------------

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.expiresAt) {
          this.store.delete(key);
        }
      }
    }, this.cleanupIntervalMs);
    this.cleanupInterval.unref();
  }

  private stopCleanupInterval(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ---------------------------------------------------------------------------
// RedisCacheProvider
// ---------------------------------------------------------------------------
@Injectable()
export class RedisCacheProvider implements ICacheService, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheProvider.name);
  private readonly defaultTtlMs: number;
  private readonly keyPrefix = 'cache:';
  private readonly client: Redis;

  constructor(@Inject(CACHE_OPTIONS) options: CacheOptions, @Inject('REDIS_CLIENT') client: Redis) {
    this.defaultTtlMs = options?.defaultTtlMs ?? 60_000;
    this.client = client;

    // Suppress Redis error events to avoid unhandled crashes
    this.client.on('error', (err: Error) => {
      this.logger.warn(`Redis client error: ${err.message}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(this.prefixed(key));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.error(`Redis get error for key "${key}": ${(err as Error).message}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      const ttl = ttlMs ?? this.defaultTtlMs;
      const serialized = JSON.stringify(value);
      await this.client.set(this.prefixed(key), serialized, 'PX', ttl);
    } catch (err) {
      this.logger.error(`Redis set error for key "${key}": ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(this.prefixed(key));
    } catch (err) {
      this.logger.error(`Redis del error for key "${key}": ${(err as Error).message}`);
    }
  }

  async reset(): Promise<void> {
    try {
      await this.client.flushall();
    } catch (err) {
      this.logger.error(`Redis reset error: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.disconnect();
    } catch (err) {
      this.logger.warn(`Redis disconnect error: ${(err as Error).message}`);
    }
  }

  // -- internal helpers ---------------------------------------------------

  private prefixed(key: string): string {
    return `${this.keyPrefix}${key}`;
  }
}
