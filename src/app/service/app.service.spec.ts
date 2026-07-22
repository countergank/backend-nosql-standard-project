import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MicroservicesNames } from '../../config/custom-providers/microservices-names.enum';
import { AppVersionNotFoundError } from '../errors/error-instances.error';
import { VersionMock } from '../mocks/version.mock';
import { AppService } from './app.service';

describe(AppService.name, () => {
  let service: AppService;
  let configService: ConfigService;

  const mockConfig = {
    npm_package_name: 'Entity Manager',
    NODE_ENV: 'local',
    npm_package_version: '1.0.0',
    [`${MicroservicesNames.EXAMPLE}_MICROSERVICE_ENABLED`]: 'false',
  };

  const mockConnection = {
    readyState: 1, // connected by default
  } as Connection;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (!(key in mockConfig)) {
                throw new AppVersionNotFoundError();
              }
              return mockConfig[key];
            },
          },
        },
        {
          provide: MicroservicesNames.EXAMPLE,
          useValue: {} as ClientProxy,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(`${AppService.prototype.getVersion.name}`, () => {
    it('should return API version', async () => {
      await expect(service.getVersion()).resolves.toEqual(new VersionMock());
    });

    it('should throw AppVersionNotFoundError if required config is missing', async () => {
      jest.spyOn(configService, 'getOrThrow').mockImplementation((key: string) => {
        if (['npm_package_version', 'NODE_ENV', 'npm_package_name'].includes(key)) {
          throw new AppVersionNotFoundError();
        }
        return mockConfig[key];
      });
      const badConfigService = {
        getOrThrow: (key: string) => {
          if (key === 'npm_package_name' || key === 'NODE_ENV' || key === 'npm_package_version') {
            throw new AppVersionNotFoundError();
          }
          return mockConfig[key];
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppService,
          { provide: ConfigService, useValue: badConfigService },
          { provide: MicroservicesNames.EXAMPLE, useValue: {} as ClientProxy },
          { provide: getConnectionToken(), useValue: mockConnection },
        ],
      }).compile();

      const serviceWithMissingConfig = module.get<AppService>(AppService);

      await expect(serviceWithMissingConfig.getVersion()).rejects.toBeInstanceOf(AppVersionNotFoundError);
    });
  });

  describe(`${AppService.prototype.getHealth.name}`, () => {
    const createTestingModule = (readyState: number) => {
      const mockConnection = { readyState } as Connection;
      return Test.createTestingModule({
        providers: [
          AppService,
          {
            provide: ConfigService,
            useValue: {
              getOrThrow: (key: string) => mockConfig[key],
            },
          },
          {
            provide: MicroservicesNames.EXAMPLE,
            useValue: {} as ClientProxy,
          },
          {
            provide: getConnectionToken(),
            useValue: mockConnection,
          },
        ],
      }).compile();
    };

    it('should return ok status when MongoDB is connected (readyState=1)', async () => {
      const module = await createTestingModule(1);
      const service = module.get<AppService>(AppService);
      const result = await service.getHealth();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        services: {
          mongodb: 'connected',
        },
      });
    });

    it('should return error status when MongoDB is disconnected (readyState=0)', async () => {
      const module = await createTestingModule(0);
      const service = module.get<AppService>(AppService);
      const result = await service.getHealth();

      expect(result).toEqual({
        status: 'error',
        timestamp: expect.any(String),
        services: {
          mongodb: 'unavailable',
        },
      });
    });

    it('should return error status when MongoDB is connecting (readyState=2)', async () => {
      const module = await createTestingModule(2);
      const service = module.get<AppService>(AppService);
      const result = await service.getHealth();

      expect(result).toEqual({
        status: 'error',
        timestamp: expect.any(String),
        services: {
          mongodb: 'unavailable',
        },
      });
    });
  });
});
