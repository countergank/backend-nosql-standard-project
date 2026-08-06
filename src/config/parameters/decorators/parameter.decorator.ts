import { ParameterDecoratorOptions } from '../parameter.types';
import { extractParameter } from './extract-parameter.helper';

/**
 * Injects a runtime parameter into a class property.
 *
 * Usage:
 * ```ts
 * class EntityService {
 *   @Parameter('ENTITY_CACHE_TTL_MS')
 *   private cacheTtlMs: number;
 * }
 * ```
 *
 * Implemented as a lazy getter over `ParameterService.instance` (deviation from
 * `createParamDecorator`, which only resolves for controller route-handler
 * parameters and cannot satisfy live runtime updates on providers). Each read
 * resolves through the store's L1 → env override → default chain, so admin
 * updates are picked up without an application restart.
 */
export function Parameter(key: string, options: ParameterDecoratorOptions = {}): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    Object.defineProperty(target, propertyKey, {
      configurable: true,
      enumerable: false,
      get(): string | number | boolean | undefined {
        return extractParameter(key, options);
      },
    });
  };
}
