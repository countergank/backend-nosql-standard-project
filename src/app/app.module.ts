import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { TraceIdMiddleware } from '../common/middleware/trace-id.middleware';
import { ConfigModuleOption } from '../config/custom-module-options/config-module-option';
import { MongooseModuleOption } from '../config/custom-module-options/mongoose-module-option';
import { ExampleMicroservice } from '../config/custom-providers/microservices';
import { EntityModule } from '../entity/entity.module';
import { AppController } from './controller/app.controller';
import { AppService } from './service/app.service';

@Module({
  controllers: [AppController],
  providers: [
    AppService,
    ExampleMicroservice,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'test' ? 'silent' : (process.env.LOG_LEVEL ?? 'info'),
        transport:
          process.env.NODE_ENV !== 'production' && process.env.LOG_PRETTY !== 'false'
            ? {
                target: 'pino-pretty',
                options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
              }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
        autoLogging: false,
      },
    }),
    ConfigModule.forRoot(ConfigModuleOption),
    MongooseModule.forRootAsync({ useClass: MongooseModuleOption }),
    EntityModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceIdMiddleware).forRoutes('*');
  }
}
