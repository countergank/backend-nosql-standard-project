import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Placeholder admin-token guard (documented as swappable until a real auth
 * module lands). Validates the `x-admin-token` header against the
 * `ADMIN_API_TOKEN` env var.
 *
 * On missing/invalid token (or unset env), responds 401 and attaches the
 * `WWW-Authenticate` challenge header via the Fastify reply.
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const token = request.headers['x-admin-token'];
    const expected = this.configService.get<string>('ADMIN_API_TOKEN');

    if (!expected || token !== expected) {
      const response = http.getResponse<{ header?: (name: string, value: string) => void }>();
      response.header?.('WWW-Authenticate', 'Bearer realm="admin"');
      throw new UnauthorizedException('Invalid or missing admin token');
    }
    return true;
  }
}
