import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ICACHE_SERVICE, ICacheService } from '../../common/cache/cache.service';
import { DomainError } from '../../common/errors/domain.error';
import { CreateEntityDTO } from '../dto/create-entity.dto';
import { Entity } from '../entities/entity.entity';
import { EntityRepository } from '../repository/entity.repository';

@Injectable()
export class EntityService {
  private readonly cacheTtlMs = 30_000; // 30s cache for entity queries

  constructor(
    private readonly entityRepository: EntityRepository,
    @Inject(ICACHE_SERVICE) private readonly cacheService: ICacheService,
  ) {}

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
    const entityDTO = plainToInstance(CreateEntityDTO, createEntityDTO);
    const newEntity = entityDTO.toEntity();
    const createdEntity: Entity = await this.entityRepository.create(newEntity);
    // Invalidate list cache on create so fresh data is served
    await this.cacheService.del('entity:all');
    return createdEntity;
  }

  async findAll(): Promise<Entity[]> {
    const cached = await this.cacheService.get<Entity[]>('entity:all');
    if (cached) return cached;

    const entitys: Entity[] = await this.entityRepository.findAll();
    await this.cacheService.set('entity:all', entitys, this.cacheTtlMs);
    return entitys;
  }

  async findById(id: string): Promise<Entity> {
    const cacheKey = `entity:id:${id}`;
    const cached = await this.cacheService.get<Entity>(cacheKey);
    if (cached) return cached;

    const entity: Entity = await this.entityRepository.findById(id);
    if (!entity) {
      throw DomainError.fromKind('ENTITY_NOT_FOUND');
    }
    await this.cacheService.set(cacheKey, entity, this.cacheTtlMs);
    return entity;
  }
}
