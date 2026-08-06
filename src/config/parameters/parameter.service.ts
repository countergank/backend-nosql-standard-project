import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ParameterRegistry } from './parameter-registry';
import { ParameterStore } from './parameter.store';
import { ParameterEntry } from './parameter.types';

/**
 * Facade over the {@link ParameterStore} exposing the runtime parameter API.
 *
 * Holds a static `instance` reference (set on application bootstrap) so the
 * `@Parameter()` decorator can resolve values without constructor injection.
 */
@Injectable()
export class ParameterService implements OnApplicationBootstrap {
  static instance: ParameterService | null = null;

  constructor(
    private readonly store: ParameterStore,
    private readonly registry: ParameterRegistry,
  ) {}

  /** Access the bootstrap-time singleton; throws if the app has not bootstrapped yet. */
  static ensureInitialized(): ParameterService {
    if (!ParameterService.instance) {
      throw new Error(
        'ParameterService is not initialized yet. Ensure ParameterModule.forRoot() is imported and the application has bootstrapped.',
      );
    }
    return ParameterService.instance;
  }

  onApplicationBootstrap(): void {
    ParameterService.instance = this;
  }

  async get(key: string): Promise<string | number | boolean> {
    return this.store.get(key);
  }

  /** Synchronous resolution (L1 → env → default) for the `@Parameter()` getter. */
  getSync(key: string): string | number | boolean | undefined {
    return this.store.getSync(key);
  }

  async set(key: string, value: string | number | boolean): Promise<void> {
    await this.store.set(key, value);
  }

  async getAll(): Promise<ParameterEntry[]> {
    const entries = await Promise.all(this.registry.getAll().map((definition) => this.buildEntry(definition.key)));
    return entries.filter((entry): entry is ParameterEntry => entry !== undefined);
  }

  async getByGroup(group: string): Promise<ParameterEntry[]> {
    const entries = await Promise.all(
      this.registry.findByGroup(group).map((definition) => this.buildEntry(definition.key)),
    );
    return entries.filter((entry): entry is ParameterEntry => entry !== undefined);
  }

  async getEntry(key: string): Promise<ParameterEntry | undefined> {
    return this.buildEntry(key);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  async delete(key: string): Promise<void> {
    await this.store.delete(key);
  }

  // -- internal helpers ------------------------------------------------------

  private async buildEntry(key: string): Promise<ParameterEntry | undefined> {
    const definition = this.registry.find(key);
    if (!definition) {
      return undefined;
    }
    return {
      key: definition.key,
      type: definition.type,
      default: definition.default,
      group: definition.group,
      ttl: definition.ttl,
      isOverridden: this.store.isEnvOverridden(key),
      description: definition.description,
      value: await this.store.get(key),
    };
  }
}
