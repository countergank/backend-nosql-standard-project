import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DomainError } from '../../common/errors/domain.error';
import { isLocal } from '../../common/utils';
import { EncodeService } from '../../encode/encode.service';
import { Entity } from '../entities/entity.entity';

@Injectable()
export class EntityRepository implements OnApplicationBootstrap {
  constructor(
    @InjectModel(Entity.name) private entityModel: Model<Entity>,
    private readonly encodeService: EncodeService,
    @InjectPinoLogger(EntityRepository.name) private readonly logger: PinoLogger,
  ) {}

  onApplicationBootstrap() {
    if (isLocal()) {
      this.populateEntitys().catch((error) => this.logger.error({ error }, 'Entity population failed'));
    }
  }

  private async populateEntitys(): Promise<Entity> {
    try {
      return this.create({
        name: 'Entity',
        lastName: 'Root',
        email: 'countergank.ti@gmail.com',
        userName: 'root',
        password: 'password',
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to populate entity');
      throw DomainError.fromKind('ENTITY_POPULATE', error);
    }
  }

  async existsByName(name: string): Promise<boolean> {
    const exists = await this.entityModel.exists({ name }).exec();
    return Boolean(exists);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const exists = await this.entityModel.exists({ email }).exec();
    return Boolean(exists);
  }

  async create(entity: Entity): Promise<Entity> {
    entity.password = this.encodeService.hash(entity.password);
    const newEntity = new this.entityModel(entity);
    return newEntity.save();
  }

  async findById(id: string): Promise<Entity> {
    return this.entityModel.findById(id).exec();
  }

  async findAll(): Promise<Entity[]> {
    return this.entityModel.find().exec();
  }
}
