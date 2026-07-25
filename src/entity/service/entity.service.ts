import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DomainError } from '../../common/errors/domain.error';
import { CreateEntityDTO } from '../dto/create-entity.dto';
import { Entity } from '../entities/entity.entity';
import { EntityRepository } from '../repository/entity.repository';

@Injectable()
export class EntityService {
  constructor(private readonly entityRepository: EntityRepository) {}

  async create(createEntityDTO: CreateEntityDTO): Promise<Entity> {
    const [entitynameAlreadyExists, emailAlreadyExists] = await Promise.all([
      this.entityRepository.existsByName(createEntityDTO.userName),
      this.entityRepository.existsByEmail(createEntityDTO.email),
    ]);

    if (entitynameAlreadyExists) {
      throw DomainError.fromKind('ENTITY_NAME_ALREADY_EXISTS');
    }
    if (emailAlreadyExists) {
      throw DomainError.fromKind('ENTITY_EMAIL_ALREADY_EXISTS');
    }
    createEntityDTO = plainToInstance(CreateEntityDTO, createEntityDTO);
    const newEntity = createEntityDTO.toEntity();
    const createdEntity: Entity = await this.entityRepository.create(newEntity);
    return createdEntity;
  }

  async findAll(): Promise<Entity[]> {
    const entitys: Entity[] = await this.entityRepository.findAll();
    return entitys;
  }

  async findById(id: string): Promise<Entity> {
    const entity: Entity = await this.entityRepository.findById(id);
    if (!entity) {
      throw DomainError.fromKind('ENTITY_NOT_FOUND');
    }
    return entity;
  }
}
