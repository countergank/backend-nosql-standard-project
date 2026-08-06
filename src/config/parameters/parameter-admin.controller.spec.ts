import { DomainError } from '../../common/errors/domain.error';
import { ParameterAdminController } from './parameter-admin.controller';
import { ParameterService } from './parameter.service';

const ENTITY_CACHE_TTL_MS = 'ENTITY_CACHE_TTL_MS';

describe(ParameterAdminController.name, () => {
  let controller: ParameterAdminController;
  let service: jest.Mocked<ParameterService>;

  beforeEach(() => {
    service = {
      getAll: jest.fn().mockResolvedValue([]),
      getByGroup: jest.fn().mockResolvedValue([]),
      getEntry: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    } as never;
    controller = new ParameterAdminController(service as never);
  });

  describe('GET /', () => {
    it('should return all parameters as DTOs', async () => {
      service.getAll.mockResolvedValue([
        {
          key: ENTITY_CACHE_TTL_MS,
          type: 'number',
          value: 30_000,
          default: 30_000,
          group: 'cache',
          ttl: 300_000,
          isOverridden: false,
        },
      ]);

      const result = await controller.findAll();

      expect(result).toEqual([
        expect.objectContaining({ key: ENTITY_CACHE_TTL_MS, value: 30_000, type: 'number', group: 'cache' }),
      ]);
    });
  });

  describe('GET /:group', () => {
    it('should return parameters filtered by group', async () => {
      service.getByGroup.mockResolvedValue([
        {
          key: ENTITY_CACHE_TTL_MS,
          type: 'number',
          value: 30_000,
          default: 30_000,
          group: 'cache',
          ttl: 300_000,
          isOverridden: false,
        },
      ]);

      const result = await controller.findByGroup('cache');

      expect(service.getByGroup).toHaveBeenCalledWith('cache');
      expect(result).toHaveLength(1);
    });
  });

  describe('PUT /:key', () => {
    it('should update the parameter and return the refreshed entry', async () => {
      service.getEntry.mockResolvedValue({
        key: ENTITY_CACHE_TTL_MS,
        type: 'number',
        value: 60_000,
        default: 30_000,
        group: 'cache',
        ttl: 300_000,
        isOverridden: false,
      });

      const result = await controller.update(ENTITY_CACHE_TTL_MS, { value: '60000' });

      expect(service.set).toHaveBeenCalledWith(ENTITY_CACHE_TTL_MS, '60000');
      expect(result).toMatchObject({ key: ENTITY_CACHE_TTL_MS, value: 60_000 });
    });

    it('should propagate PARAMETER_NOT_FOUND for unknown keys', async () => {
      service.set.mockRejectedValue(DomainError.fromKind('PARAMETER_NOT_FOUND'));

      await expect(controller.update('UNKNOWN_KEY', { value: 'x' })).rejects.toMatchObject({
        kind: 'PARAMETER_NOT_FOUND',
      });
    });

    it('should propagate PARAMETER_ENV_OVERRIDDEN for env-bound parameters', async () => {
      service.set.mockRejectedValue(DomainError.fromKind('PARAMETER_ENV_OVERRIDDEN'));

      await expect(controller.update(ENTITY_CACHE_TTL_MS, { value: '60000' })).rejects.toMatchObject({
        kind: 'PARAMETER_ENV_OVERRIDDEN',
      });
    });

    it('should propagate PARAMETER_INVALID_VALUE for invalid values', async () => {
      service.set.mockRejectedValue(DomainError.fromKind('PARAMETER_INVALID_VALUE'));

      await expect(controller.update(ENTITY_CACHE_TTL_MS, { value: 'abc' })).rejects.toMatchObject({
        kind: 'PARAMETER_INVALID_VALUE',
      });
    });
  });
});
