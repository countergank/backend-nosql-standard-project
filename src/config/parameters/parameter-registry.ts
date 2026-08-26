import { DomainError } from '../../common/errors/domain.error';
import { ParameterDefinition } from './parameter.types';

/**
 * Compile-time registry of parameter definitions.
 *
 * Definitions are registered once at module initialization (see
 * `ParameterModule.forRoot`) and stay immutable for the process lifetime.
 */
export class ParameterRegistry {
  private readonly definitions = new Map<string, ParameterDefinition>();

  register(definition: ParameterDefinition): void {
    if (this.definitions.has(definition.key)) {
      throw new Error(`Parameter "${definition.key}" is already registered`);
    }
    this.definitions.set(definition.key, definition);
  }

  find(key: string): ParameterDefinition | undefined {
    return this.definitions.get(key);
  }

  has(key: string): boolean {
    return this.definitions.has(key);
  }

  getAll(): ParameterDefinition[] {
    return [...this.definitions.values()];
  }

  findByGroup(group: string): ParameterDefinition[] {
    return this.getAll().filter((definition) => definition.group === group);
  }

  listGroups(): string[] {
    return [...new Set(this.getAll().map((definition) => definition.group))];
  }

  getDefault(key: string): string | number | boolean {
    const definition = this.require(key);
    return definition.default;
  }

  getTTL(key: string): number {
    const definition = this.require(key);
    return definition.ttl;
  }

  /**
   * Validate a value against the definition for `key`.
   *
   * Throws `PARAMETER_NOT_FOUND` for unknown keys and `PARAMETER_INVALID_VALUE`
   * when the value type does not match the declared type or the custom
   * validation function rejects it.
   */
  validate(key: string, value: unknown): void {
    const definition = this.require(key);

    const typeValid =
      definition.type === 'string'
        ? typeof value === 'string'
        : definition.type === 'number'
          ? typeof value === 'number'
          : definition.type === 'boolean'
            ? typeof value === 'boolean'
            : false;

    if (!typeValid) {
      throw DomainError.fromKind(
        'PARAMETER_INVALID_VALUE',
        undefined,
        `Parameter "${key}" must be of type ${definition.type}`,
      );
    }

    if (definition.validate && !definition.validate(value as never)) {
      throw DomainError.fromKind('PARAMETER_INVALID_VALUE', undefined, `Parameter "${key}" failed validation`);
    }
  }

  private require(key: string): ParameterDefinition {
    const definition = this.definitions.get(key);
    if (!definition) {
      throw DomainError.fromKind('PARAMETER_NOT_FOUND');
    }
    return definition;
  }
}
