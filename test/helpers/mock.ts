import { InjectionToken } from '@nestjs/common';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';

export const Mock = (token: InjectionToken) => {
  const moduleMocker = new ModuleMocker(global);
  const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
  const mock = moduleMocker.generateFromMetadata(mockMetadata);
  return new mock();
};
