import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common/interfaces';
import { AdminApiKeyGuard } from './parameter-admin.guard';

function buildContext(headerValue: string | undefined): { context: ExecutionContext; header: jest.Mock } {
  const header = jest.fn();
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { 'x-admin-token': headerValue } }),
      getResponse: () => ({ header }),
    }),
  } as unknown as ExecutionContext;
  return { context, header };
}

describe(AdminApiKeyGuard.name, () => {
  let configService: { get: jest.Mock };
  let guard: AdminApiKeyGuard;

  beforeEach(() => {
    configService = { get: jest.fn().mockReturnValue('super-secret-admin-token') };
    guard = new AdminApiKeyGuard(configService as never);
  });

  it('should allow a request with a valid token', () => {
    const { context } = buildContext('super-secret-admin-token');

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw 401 Unauthorized with WWW-Authenticate when the token is missing', () => {
    const { context, header } = buildContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(header).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer realm="admin"');
  });

  it('should throw 401 Unauthorized with WWW-Authenticate when the token is invalid', () => {
    const { context, header } = buildContext('wrong-token');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(header).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer realm="admin"');
  });

  it('should throw 401 Unauthorized when ADMIN_API_TOKEN is not configured', () => {
    configService.get.mockReturnValue(undefined);
    const { context } = buildContext('super-secret-admin-token');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
