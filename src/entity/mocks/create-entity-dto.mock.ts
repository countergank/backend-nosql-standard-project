import { faker } from '@faker-js/faker';
import { CreateEntityDTO } from '../dto/create-entity.dto';

export class CreateEntityDTOMock extends CreateEntityDTO {
  name = 'Leandro';
  lastName = 'Cepeda';
  email = 'leandrojaviercepeda@gmail.com';
  userName = 'leandrojaviercepeda';
  password = 'secret';

  randomize(): CreateEntityDTOMock {
    this.name = faker.person.firstName();
    this.lastName = faker.person.lastName();
    this.email = faker.internet.email({ firstName: this.name, lastName: this.lastName });
    this.userName = faker.person.fullName();
    this.password = 'random';
    return this;
  }
}
