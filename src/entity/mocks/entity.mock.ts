import { faker } from '@faker-js/faker';
import { Entity } from '../entities/entity.entity';

export class EntityMock extends Entity {
  name = 'Leandro';
  lastName = 'Cepeda';
  email = 'leandrojaviercepeda@gmail.com';
  userName = 'leandrojaviercepeda';
  password = 'root';

  randomize(): EntityMock {
    this.name = faker.person.firstName();
    this.lastName = faker.person.lastName();
    this.email = faker.internet.email({ firstName: this.name, lastName: this.lastName });
    this.userName = faker.person.fullName();
    this.password = faker.string.alphanumeric(10);
    return this;
  }
}
