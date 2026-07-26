import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Message } from '../../common/class/message.class';
import { GetVersionDoc, PostMessageMicroserviceDoc } from '../api-docs/app.decorator';
import { Version } from '../class/version.class';
import { AppService } from '../service/app.service';
import { HealthStatus } from '../service/app.service';

@ApiTags('Root')
@Controller({ version: [VERSION_NEUTRAL] })
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async getHealth(): Promise<HealthStatus> {
    const result = await this.appService.getHealth();
    if (result.status === 'error') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }

  @GetVersionDoc()
  @Get()
  async getVersion(): Promise<Version> {
    return await this.appService.getVersion();
  }

  @PostMessageMicroserviceDoc()
  @Post('message-microservice/:message-pattern')
  async messageMicroservice(
    @Param('message-pattern') messagePattern: string,
    @Body() body: Message<unknown>,
  ): Promise<Message<unknown>> {
    return await this.appService.messageMicroservice(messagePattern, body);
  }
}
