import { DomainError } from '../../common/errors/domain.error';
import { PARAMETER_DEFINITIONS } from './parameter-definitions';
import { ParameterRegistry } from './parameter-registry';
import { ParameterDefinition } from './parameter.types';

const ENTITY_CACHE_TTL_MS = 'ENTITY_CACHE_TTL_MS';

describe('PARAMETER_DEFINITIONS', () => {
  it('should seed ENTITY_CACHE_TTL_MS with cache group, number type, default 30000 and ttl 300000', () => {
    const definition = PARAMETER_DEFINITIONS.find((d) => d.key === ENTITY_CACHE_TTL_MS);

    expect(definition).toBeDefined();
    expect(definition?.type).toBe('number');
    expect(definition?.default).toBe(30_000);
    expect(definition?.group).toBe('cache');
    expect(definition?.ttl).toBe(300_000);
  });

  it('should reject non-positive numbers via the validation function', () => {
    const definition = PARAMETER_DEFINITIONS.find((d) => d.key === ENTITY_CACHE_TTL_MS) as ParameterDefinition;

    expect(definition.validate?.(60_000)).toBe(true);
    expect(definition.validate?.(0)).toBe(false);
    expect(definition.validate?.(-5)).toBe(false);
    expect(definition.validate?.(Number.NaN)).toBe(false);
  });
});

describe(ParameterRegistry.name, () => {
  let registry: ParameterRegistry;

  beforeEach(() => {
    registry = new ParameterRegistry();
    for (const definition of PARAMETER_DEFINITIONS) {
      registry.register(definition);
    }
  });

  describe('register', () => {
    it('should make the definition available through find and has', () => {
      expect(registry.has(ENTITY_CACHE_TTL_MS)).toBe(true);
      expect(registry.find(ENTITY_CACHE_TTL_MS)?.type).toBe('number');
    });

    it('should throw when the same key is registered twice', () => {
      const duplicate: ParameterDefinition = {
        key: ENTITY_CACHE_TTL_MS,
        type: 'number',
        default: 1,
        group: 'cache',
        ttl: 1000,
      };

      expect(() => registry.register(duplicate)).toThrow(`Parameter "${ENTITY_CACHE_TTL_MS}" is already registered`);
    });
  });

  describe('find', () => {
    it('should return undefined for unknown keys', () => {
      expect(registry.find('UNKNOWN_KEY')).toBeUndefined();
    });
  });

  describe('validate', () => {
    const captureKind = (fn: () => void): string => {
      let thrown: unknown;
      try {
        fn();
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(DomainError);
      return (thrown as DomainError).kind;
    };

    it('should throw PARAMETER_NOT_FOUND for unknown keys', () => {
      expect(captureKind(() => registry.validate('UNKNOWN_KEY', 1))).toBe('PARAMETER_NOT_FOUND');
    });

    it('should throw PARAMETER_INVALID_VALUE when the custom validation fails', () => {
      expect(captureKind(() => registry.validate(ENTITY_CACHE_TTL_MS, -100))).toBe('PARAMETER_INVALID_VALUE');
    });

    it('should throw PARAMETER_INVALID_VALUE when the value type mismatches the declared type', () => {
      expect(captureKind(() => registry.validate(ENTITY_CACHE_TTL_MS, 'not-a-number'))).toBe('PARAMETER_INVALID_VALUE');
    });

    it('should not throw for a valid value', () => {
      expect(() => registry.validate(ENTITY_CACHE_TTL_MS, 60_000)).not.toThrow();
    });
  });

  describe('getDefault / getTTL', () => {
    it('should return the registered default and ttl', () => {
      expect(registry.getDefault(ENTITY_CACHE_TTL_MS)).toBe(30_000);
      expect(registry.getTTL(ENTITY_CACHE_TTL_MS)).toBe(300_000);
    });

    it('should throw PARAMETER_NOT_FOUND for unknown keys', () => {
      expect(() => registry.getDefault('UNKNOWN_KEY')).toThrow();
      expect(() => registry.getTTL('UNKNOWN_KEY')).toThrow();
    });
  });

  describe('getAll / findByGroup / listGroups', () => {
    it('should return every registered definition', () => {
      expect(registry.getAll()).toHaveLength(PARAMETER_DEFINITIONS.length);
      expect(registry.getAll().map((d) => d.key)).toContain(ENTITY_CACHE_TTL_MS);
    });

    it('should filter definitions by group', () => {
      const cacheGroup = registry.findByGroup('cache');

      expect(cacheGroup.length).toBeGreaterThan(0);
      expect(cacheGroup.every((d) => d.group === 'cache')).toBe(true);
    });

    it('should return an empty array for unknown groups', () => {
      expect(registry.findByGroup('throttle')).toEqual([]);
    });

    it('should list unique group names', () => {
      const groups = registry.listGroups();

      expect(groups).toContain('cache');
      expect(new Set(groups).size).toBe(groups.length);
    });
  });
});
