import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetAllParametersDoc, GetParametersByGroupDoc, UpdateParameterDoc } from './api-docs/parameter-admin.docs';
import { ParameterEntryDto } from './dto/parameter-entry.dto';
import { UpdateParameterDto } from './dto/update-parameter.dto';
import { AdminApiKeyGuard } from './parameter-admin.guard';
import { ParameterService } from './parameter.service';

@ApiTags('Admin Parameters')
@Controller({ path: 'admin/parameters', version: '1' })
@UseGuards(AdminApiKeyGuard)
export class ParameterAdminController {
  constructor(private readonly parameterService: ParameterService) {}

  @GetAllParametersDoc()
  @Get()
  async findAll(): Promise<ParameterEntryDto[]> {
    const entries = await this.parameterService.getAll();
    return entries.map((entry) => ParameterEntryDto.of(entry));
  }

  @GetParametersByGroupDoc()
  @Get(':group')
  async findByGroup(@Param('group') group: string): Promise<ParameterEntryDto[]> {
    const entries = await this.parameterService.getByGroup(group);
    return entries.map((entry) => ParameterEntryDto.of(entry));
  }

  @UpdateParameterDoc()
  @Put(':key')
  async update(@Param('key') key: string, @Body() dto: UpdateParameterDto): Promise<ParameterEntryDto> {
    await this.parameterService.set(key, dto.value);
    return ParameterEntryDto.of(await this.parameterService.getEntry(key));
  }
}
