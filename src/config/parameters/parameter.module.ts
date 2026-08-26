import { DynamicModule, Global, Module } from '@nestjs/common';
import { PARAMETER_DEFINITIONS } from './parameter-definitions';
import { ParameterRegistry } from './parameter-registry';
import { ParameterService } from './parameter.service';
import { ParameterStore } from './parameter.store';
import { ParameterDefinition } from './parameter.types';

/**
 * Global module providing the runtime parameter system.
 *
 * - Seeds the {@link ParameterRegistry} with the compiled definitions
 * - Provides + exports {@link ParameterStore} and {@link ParameterService} so
 *   any consumer can inject them without importing this module
 *
 * `ICACHE_SERVICE` and `ConfigService` are expected to come from the global
 * `CacheModule.forRoot()` and `ConfigModule` respectively.
 */
@Global()
@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS dynamic module pattern requires static forRoot()
export class ParameterModule {
  /**
   * @param overrides - alternative definition set (defaults to `PARAMETER_DEFINITIONS`).
   */
  static forRoot(overrides: ParameterDefinition[] = PARAMETER_DEFINITIONS): DynamicModule {
    const registryProvider = {
      provide: ParameterRegistry,
      useFactory: () => {
        const registry = new ParameterRegistry();
        for (const definition of overrides) {
          registry.register(definition);
        }
        return registry;
      },
    };

    return {
      module: ParameterModule,
      global: true,
      providers: [registryProvider, ParameterStore, ParameterService],
      exports: [ParameterRegistry, ParameterStore, ParameterService],
    };
  }
}
