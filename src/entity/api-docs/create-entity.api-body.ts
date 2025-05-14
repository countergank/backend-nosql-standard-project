import { ApiBodyOptions, getSchemaPath } from '@nestjs/swagger';
import { CreateEntityDTO } from '../dto/create-entity.dto';
import { CreateEntityDTOMock } from '../mocks/create-entity-dto.mock';

export const CREATE_ENTITY_SWAGGER: ApiBodyOptions = {
  examples: {
    'Crear Entidad': {
      value: new CreateEntityDTOMock(),
    },
  },
  schema: {
    $ref: getSchemaPath(CreateEntityDTO),
  },
};
