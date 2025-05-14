import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CustomLogger } from '../../common/logger';
import { isLocal } from '../../common/utils';
import { EncodeService } from '../../encode/encode.service';
import { Entity } from '../entities/entity.entity';
import { EntityPopulateError } from '../errors/error-instances.error';

@Injectable()
export class EntityRepository implements OnApplicationBootstrap {
  private readonly logger = new CustomLogger(EntityRepository.name);
  constructor(@InjectModel(Entity.name) private entityModel: Model<Entity>, private readonly encodeService: EncodeService) { }

  onApplicationBootstrap() {
    if (isLocal()) {
      this.populateEntitys().catch((error) => this.logger.error(error));
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
      this.logger.error(error);
      throw new EntityPopulateError(error);
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
