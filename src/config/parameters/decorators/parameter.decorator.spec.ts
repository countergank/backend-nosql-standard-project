import { DomainError } from '../../../common/errors/domain.error';
import { ParameterService } from '../parameter.service';
import { extractParameter } from './extract-parameter.helper';
import { Parameter } from './parameter.decorator';

const ENTITY_CACHE_TTL_MS = 'ENTITY_CACHE_TTL_MS';

class Consumer {
  @Parameter(ENTITY_CACHE_TTL_MS)
  ttl: unknown;

  @Parameter('UNKNOWN_PARAM')
  unknown: unknown;

  @Parameter('UNKNOWN_STRICT', { strict: true })
  strictUnknown: unknown;
}

describe('extractParameter', () => {
  afterEach(() => {
    ParameterService.instance = null;
  });

  it('should return the resolved value from ParameterService.instance', () => {
    ParameterService.instance = { getSync: jest.fn().mockReturnValue(60_000) } as never;

    expect(extractParameter(ENTITY_CACHE_TTL_MS)).toBe(60_000);
  });

  it('should return undefined for an unknown key in non-strict mode', () => {
    ParameterService.instance = { getSync: jest.fn().mockReturnValue(undefined) } as never;

    expect(extractParameter('UNKNOWN_PARAM')).toBeUndefined();
  });

  it('should throw PARAMETER_NOT_FOUND for an unknown key in strict mode', () => {
    ParameterService.instance = { getSync: jest.fn().mockReturnValue(undefined) } as never;

    const capture = () => {
      try {
        extractParameter('UNKNOWN_STRICT', { strict: true });
        return undefined;
      } catch (error) {
        return error as DomainError;
      }
    };

    expect(capture()).toBeInstanceOf(DomainError);
    expect((capture() as DomainError).kind).toBe('PARAMETER_NOT_FOUND');
  });

  it('should throw when the service is not initialized yet', () => {
    expect(() => extractParameter(ENTITY_CACHE_TTL_MS)).toThrow(/not initialized/i);
  });
});

describe(Parameter.name, () => {
  afterEach(() => {
    ParameterService.instance = null;
  });

  it('should install a live getter resolving through ParameterService.instance', () => {
    const getSync = jest.fn().mockReturnValue(30_000);
    ParameterService.instance = { getSync } as never;

    const consumer = new Consumer();
    expect(consumer.ttl).toBe(30_000);
    expect(getSync).toHaveBeenCalledWith(ENTITY_CACHE_TTL_MS);
  });

  it('should reflect updated values on subsequent reads (runtime change)', () => {
    const getSync = jest.fn().mockReturnValue(30_000);
    ParameterService.instance = { getSync } as never;

    const consumer = new Consumer();
    expect(consumer.ttl).toBe(30_000);

    getSync.mockReturnValue(60_000);
    expect(consumer.ttl).toBe(60_000);
  });

  it('should return undefined for unknown keys in non-strict mode', () => {
    ParameterService.instance = { getSync: jest.fn().mockReturnValue(undefined) } as never;

    expect(new Consumer().unknown).toBeUndefined();
  });

  it('should throw PARAMETER_NOT_FOUND for unknown keys in strict mode', () => {
    ParameterService.instance = { getSync: jest.fn().mockReturnValue(undefined) } as never;

    const capture = () => {
      try {
        new Consumer().strictUnknown;
        return undefined;
      } catch (error) {
        return error as DomainError;
      }
    };

    expect(capture()).toBeInstanceOf(DomainError);
    expect((capture() as DomainError).kind).toBe('PARAMETER_NOT_FOUND');
  });

  it('should throw when the service is not initialized yet', () => {
    const consumer = new Consumer();

    expect(() => consumer.ttl).toThrow(/not initialized/i);
  });
});
