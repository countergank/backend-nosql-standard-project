import { Module } from '@nestjs/common';
import { ParameterAdminController } from './parameter-admin.controller';
import { AdminApiKeyGuard } from './parameter-admin.guard';

/**
 * Admin HTTP surface for runtime parameters.
 *
 * `ParameterService` and `ConfigService` resolve from the global
 * `ParameterModule` / `ConfigModule` — no imports needed here.
 */
@Module({
  controllers: [ParameterAdminController],
  providers: [AdminApiKeyGuard],
})
export class ParameterAdminModule {}
