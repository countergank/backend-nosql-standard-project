import { Entity } from '../entities/entity.entity';

export class EntityDTO {
  id: string;
  name: string;
  lastName: string;
  email: string;
  userName: string;
  createdAt: string;
  updatedAt: string;

  constructor(entity: Entity) {
    this.id = entity.id;
    this.name = entity.name;
    this.lastName = entity.lastName;
    this.email = entity.email;
    this.userName = entity.userName;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }

  static of(entity: Entity): EntityDTO {
    return new EntityDTO(entity);
  }
}
