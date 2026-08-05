import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ICACHE_SERVICE, ICacheService } from '../../common/cache/cache.service';
import { DomainError } from '../../common/errors/domain.error';
import { ParameterRegistry } from './parameter-registry';
import { ParameterDefinition, ParameterEntry, ParameterType } from './parameter.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Redis key prefix for parameter values. */
export const PARAMETER_KEY_PREFIX = 'param:';

/** Event emitted whenever a parameter is successfully modified. */
export const PARAMETER_CHANGED_EVENT = 'parameter.changed';

export interface ParameterChangedEvent {
  key: string;
  value: string | number | boolean;
}

// ---------------------------------------------------------------------------
// ParameterStore
// ---------------------------------------------------------------------------

/**
 * Registry-backed runtime configuration store.
 *
 * Read priority (per design): L1 in-memory cache → env override (ConfigService,
 * keyed by the parameter name) → Redis via `ICACHE_SERVICE` → registry default.
 *
 * Writes persist to Redis via `ICACHE_SERVICE` (key prefix `param:`, TTL in ms),
 * invalidate the L1 entry, and emit a `parameter.changed` event. The EventEmitter
 * is optional: if `EventEmitterModule` is not imported, events silently no-op.
 */
@Injectable()
export class ParameterStore {
  static readonly KEY_PREFIX = PARAMETER_KEY_PREFIX;

  private readonly logger = new Logger(ParameterStore.name);
  private readonly l1 = new Map<string, { value: string | number | boolean; expiresAt: number }>();

  constructor(
    @Inject(ICACHE_SERVICE) private readonly cacheService: ICacheService,
    private readonly configService: ConfigService,
    private readonly registry: ParameterRegistry,
    @Optional() @Inject(EventEmitter2) private readonly eventEmitter?: EventEmitter2,
  ) {}

  /** True when the key is registered (definition exists), regardless of value. */
  has(key: string): boolean {
    return this.registry.has(key);
  }

  /** True when the parameter is currently bound to an environment variable. */
  isEnvOverridden(key: string): boolean {
    const raw = this.configService.get<string>(key);
    return raw !== undefined && raw !== null;
  }

  /**
   * Resolve a parameter value following L1 → env override → Redis → default.
   * Throws `PARAMETER_NOT_FOUND` for unregistered keys.
   */
  async get(key: string): Promise<string | number | boolean> {
    const definition = this.requireDefinition(key);

    const cached = this.readL1(key);
    if (cached !== undefined) {
      return cached;
    }

    const envValue = this.configService.get<string>(key);
    if (envValue !== undefined && envValue !== null) {
      const coerced = this.coerce(envValue, definition.type);
      this.validate(definition, coerced);
      this.writeL1(key, coerced, definition.ttl);
      return coerced;
    }

    try {
      const remote = await this.cacheService.get<string | number | boolean>(`${PARAMETER_KEY_PREFIX}${key}`);
      if (remote !== null && remote !== undefined) {
        const coerced = this.coerce(remote, definition.type);
        this.validate(definition, coerced);
        this.writeL1(key, coerced, definition.ttl);
        return coerced;
      }
    } catch (error) {
      this.logger.warn(`Parameter "${key}": cache get failed, falling back to default: ${(error as Error).message}`);
    }

    const fallback = definition.default;
    try {
      await this.cacheService.set(`${PARAMETER_KEY_PREFIX}${key}`, fallback, definition.ttl);
    } catch (error) {
      this.logger.warn(`Parameter "${key}": cache seed failed, continuing with default: ${(error as Error).message}`);
    }
    this.writeL1(key, fallback, definition.ttl);
    return fallback;
  }

  /**
   * Synchronous resolution for constructor injection paths: L1 → env override →
   * default. Returns `undefined` for unknown keys (construction must not throw).
   */
  getSync(key: string): string | number | boolean | undefined {
    const definition = this.registry.find(key);
    if (!definition) {
      return undefined;
    }

    const cached = this.readL1(key);
    if (cached !== undefined) {
      return cached;
    }

    const envValue = this.configService.get<string>(key);
    if (envValue !== undefined && envValue !== null) {
      const coerced = this.coerce(envValue, definition.type);
      this.validate(definition, coerced);
      this.writeL1(key, coerced, definition.ttl);
      return coerced;
    }

    this.writeL1(key, definition.default, definition.ttl);
    return definition.default;
  }

  /**
   * Persist a parameter value: validate → write to Redis (graceful on failure) →
   * invalidate L1 → emit `parameter.changed`.
   */
  async set(key: string, value: string | number | boolean): Promise<void> {
    const definition = this.requireDefinition(key);

    if (this.isEnvOverridden(key)) {
      throw DomainError.fromKind(
        'PARAMETER_ENV_OVERRIDDEN',
        undefined,
        `Parameter '${key}' is bound to an environment variable and cannot be modified at runtime`,
      );
    }

    const coerced = this.coerce(value, definition.type);
    this.validate(definition, coerced);

    try {
      await this.cacheService.set(`${PARAMETER_KEY_PREFIX}${key}`, coerced, definition.ttl);
    } catch (error) {
      this.logger.warn(
        `Parameter "${key}": cache set failed, continuing without persistence: ${(error as Error).message}`,
      );
    }

    // Live write-through into L1 (deviation from design "invalidate"): keeps
    // synchronous reads (getSync/@Parameter()) live after an admin update.
    this.l1.set(key, { value: coerced, expiresAt: Date.now() + definition.ttl });
    this.eventEmitter?.emit(PARAMETER_CHANGED_EVENT, { key, value: coerced } satisfies ParameterChangedEvent);
  }

  /** Remove a parameter value from Redis and invalidate L1. */
  async delete(key: string): Promise<void> {
    this.requireDefinition(key);

    try {
      await this.cacheService.del(`${PARAMETER_KEY_PREFIX}${key}`);
    } catch (error) {
      this.logger.warn(`Parameter "${key}": cache delete failed, continuing: ${(error as Error).message}`);
    }

    this.l1.delete(key);
  }

  /** Resolve several parameters in parallel. */
  async getByKeys(keys: string[]): Promise<Map<string, string | number | boolean>> {
    const entries = await Promise.all(keys.map(async (key) => [key, await this.get(key)] as const));
    return new Map(entries);
  }

  /** Build a public entry (value + metadata) for a registered key. */
  getEntry(key: string): ParameterEntry | undefined {
    const definition = this.registry.find(key);
    if (!definition) {
      return undefined;
    }
    const value = this.getSync(key) ?? definition.default;
    return {
      key,
      value,
      type: definition.type,
      group: definition.group,
      isOverridden: this.isEnvOverridden(key),
      ttl: definition.ttl,
      default: definition.default,
    };
  }

  // -- internal helpers ------------------------------------------------------

  private requireDefinition(key: string): ParameterDefinition<string | number | boolean> {
    const definition = this.registry.find(key);
    if (!definition) {
      throw DomainError.fromKind('PARAMETER_NOT_FOUND', undefined, `Parameter '${key}' is not defined`);
    }
    return definition;
  }

  private validate(definition: ParameterDefinition<unknown>, value: string | number | boolean): void {
    this.registry.validate(definition.key, value);
  }

  private coerce(value: string | number | boolean, type: ParameterType): string | number | boolean {
    switch (type) {
      case 'number': {
        if (typeof value === 'number') {
          return value;
        }
        return Number(value);
      }
      case 'boolean': {
        if (typeof value === 'boolean') {
          return value;
        }
        if (value === 'true') {
          return true;
        }
        if (value === 'false') {
          return false;
        }
        throw DomainError.fromKind('PARAMETER_INVALID_VALUE', undefined, `'${value}' is not a valid boolean`);
      }
      case 'string':
        return String(value);
    }
  }

  private readL1(key: string): string | number | boolean | undefined {
    const entry = this.l1.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.l1.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private writeL1(key: string, value: string | number | boolean, ttlMs: number): void {
    this.l1.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}
