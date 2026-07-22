import { BadRequestException, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Mock } from '../../../test/helpers';
import { Version } from '../class/version.class';
import { AppVersionNotFoundError } from '../errors/error-instances.error';
import { VersionMock } from '../mocks/version.mock';
import { AppService, HealthStatus } from '../service/app.service';
import { AppController } from './app.controller';

describe(AppController.name, () => {
  let controller: AppController;
  let appService: AppService;

  const mockConnection = {
    readyState: 1, // connected by default
  } as Connection;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const configMap: Record<string, any> = {
                EXAMPLE_MICROSERVICE_ENABLED: false,
                npm_package_name: 'test-package',
                NODE_ENV: 'test',
                npm_package_version: '1.0.0',
              };
              return configMap[key];
            },
            getOrThrow: (key: string) => {
              const configMap: Record<string, any> = {
                EXAMPLE_MICROSERVICE_ENABLED: false,
                npm_package_name: 'test-package',
                NODE_ENV: 'test',
                npm_package_version: '1.0.0',
              };
              if (!(key in configMap)) {
                throw new Error(`Configuration key "${key}" does not exist`);
              }
              return configMap[key];
            },
          },
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    })
      .useMocker((token) => {
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    controller = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  it(`${AppController.name} should be defined`, () => {
    expect(controller).toBeDefined();
  });

  describe(`${AppController.name}.${AppController.prototype.getVersion.name}`, () => {
    it('should return API version', async () => {
      jest.spyOn(appService, 'getVersion').mockResolvedValue(new VersionMock());
      await expect(controller.getVersion()).resolves.toBeInstanceOf(Version);
    });

    it(`should return ${AppVersionNotFoundError.name}`, async () => {
      jest.spyOn(appService, 'getVersion').mockRejectedValueOnce(new AppVersionNotFoundError());
      await expect(controller.getVersion()).rejects.toThrow(BadRequestException);
    });

    it(`should return ${InternalServerErrorException.name}`, async () => {
      jest.spyOn(appService, 'getVersion').mockRejectedValueOnce(new InternalServerErrorException());
      await expect(controller.getVersion()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe(`${AppController.prototype.getHealth.name}`, () => {
    it('should return health status from service', async () => {
      const healthResult: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: { mongodb: 'connected' },
      };
      jest.spyOn(appService, 'getHealth').mockResolvedValue(healthResult);

      const result = await controller.getHealth();

      expect(result).toEqual(healthResult);
      expect(appService.getHealth).toHaveBeenCalled();
    });

    it('should return error status when service returns error', async () => {
      const healthResult: HealthStatus = {
        status: 'error',
        timestamp: new Date().toISOString(),
        services: { mongodb: 'unavailable' },
      };
      jest.spyOn(appService, 'getHealth').mockResolvedValue(healthResult);

      await expect(controller.getHealth()).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
