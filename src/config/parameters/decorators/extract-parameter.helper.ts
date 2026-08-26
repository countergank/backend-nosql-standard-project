import { DomainError } from '../../../common/errors/domain.error';
import { ParameterService } from '../parameter.service';
import { ParameterDecoratorOptions } from '../parameter.types';

/**
 * Resolve a parameter value from the bootstrap-time {@link ParameterService}
 * instance. Used by the `@Parameter()` decorator getter.
 *
 * - Throws when the service has not been initialized yet (app not bootstrapped)
 * - Throws `PARAMETER_NOT_FOUND` for unknown keys in strict mode
 * - Returns `undefined` for unknown keys in non-strict mode
 */
export function extractParameter(
  key: string,
  options: ParameterDecoratorOptions = {},
): string | number | boolean | undefined {
  const service = ParameterService.ensureInitialized();
  const value = service.getSync(key);

  if (value === undefined) {
    if (options.strict) {
      throw DomainError.fromKind('PARAMETER_NOT_FOUND', undefined, `Parameter '${key}' is not defined`);
    }
    return undefined;
  }
  return value;
}
