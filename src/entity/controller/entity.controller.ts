import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateEntityDoc, FindAllEntityDoc, FindByIdEntityDoc } from '../api-docs/entity.decorator';
import { CreateEntityResponseDTO } from '../dto/create-entity-response.dto';
import { CreateEntityDTO } from '../dto/create-entity.dto';
import { EntityDTO } from '../dto/entity.dto';
import { Entity } from '../entities/entity.entity';
import { EntityService } from '../service/entity.service';

@ApiTags('Entity')
@Controller({ path: 'entity', version: '1' })
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  @CreateEntityDoc()
  @Post('create')
  async create(@Body() createEntityDTO: CreateEntityDTO): Promise<CreateEntityResponseDTO> {
    const entity: Entity = await this.entityService.create(createEntityDTO);
    return CreateEntityResponseDTO.of(entity);
  }

  @FindByIdEntityDoc()
  @Get(':id')
  async findById(@Param('id') id: string): Promise<EntityDTO> {
    const entity: Entity = await this.entityService.findById(id);
    return EntityDTO.of(entity);
  }

  @FindAllEntityDoc()
  @Get('')
  async findAll(): Promise<EntityDTO[]> {
    const entitys: Entity[] = await this.entityService.findAll();
    return entitys.map((entity) => EntityDTO.of(entity));
  }
}
