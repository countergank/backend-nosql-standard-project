import { Entity } from '../entities/entity.entity';

export class CreateEntityResponseDTO {
  name: string;
  lastName: string;
  email: string;
  userName: string;
  createdAt: string;
  updatedAt: string;

  constructor(entity: Entity) {
    this.name = entity.name;
    this.lastName = entity.lastName;
    this.email = entity.email;
    this.userName = entity.userName;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }

  static of(entity: Entity): CreateEntityResponseDTO {
    return new CreateEntityResponseDTO(entity);
  }
}
