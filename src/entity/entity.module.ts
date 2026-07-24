import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EncodeService } from '../encode/encode.service';
import { EntityController } from './controller/entity.controller';
import { Entity, EntitySchema } from './entities/entity.entity';
import { EntityRepository } from './repository/entity.repository';
import { EntityService } from './service/entity.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Entity.name, schema: EntitySchema }])],
  controllers: [EntityController],
  providers: [EncodeService, EntityRepository, EntityService],
  exports: [EntityService],
})
export class EntityModule {}
