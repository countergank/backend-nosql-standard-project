import { BadRequestException, Body, Controller, Get, InternalServerErrorException, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CustomLogger } from '../../common/logger';
import { CreateEntityDoc, FindAllEntityDoc, FindByIdEntityDoc } from '../api-docs/entity.decorator';
import { CreateEntityResponseDTO } from '../dto/create-entity-response.dto';
import { CreateEntityDTO } from '../dto/create-entity.dto';
import { EntityDTO } from '../dto/entity.dto';
import { Entity } from '../entities/entity.entity';
import { EntityEmailAlreadyExistsError, EntityNameAlreadyExistsError, EntityNotFoundError } from '../errors/error-instances.error';
import { EntityService } from '../service/entity.service';

@ApiTags('Entity')
@Controller({ path: 'entity', version: '1' })
export class EntityController {
  private readonly logger = new CustomLogger(EntityController.name);
  constructor(private readonly entityService: EntityService) { }

  @CreateEntityDoc()
  @Post('create')
  async create(@Body() createEntityDTO: CreateEntityDTO): Promise<CreateEntityResponseDTO> {
    try {
      const entity: Entity = await this.entityService.create(createEntityDTO);
      return CreateEntityResponseDTO.of(entity);
    } catch (error) {
      if (error instanceof EntityNameAlreadyExistsError || error instanceof EntityEmailAlreadyExistsError) {
        throw new BadRequestException(error.getErrorPublic());
      }
      this.logger.error(error.message, error.stack);
      throw new InternalServerErrorException();
    }
  }

  @FindByIdEntityDoc()
  @Get(':id')
  async findById(@Param('id') id: string): Promise<EntityDTO> {
    try {
      const entity: Entity = await this.entityService.findById(id);
      return EntityDTO.of(entity);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new BadRequestException(error.getErrorPublic());
      }
      this.logger.error(error.message, error.stack);
      throw new InternalServerErrorException();
    }
  }

  @FindAllEntityDoc()
  @Get('')
  async findAll(): Promise<EntityDTO[]> {
    try {
      const entitys: Entity[] = await this.entityService.findAll();
      return entitys.map((entity) => EntityDTO.of(entity));
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw new InternalServerErrorException();
    }
  }
}
