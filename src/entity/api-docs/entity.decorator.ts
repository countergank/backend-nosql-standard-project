import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import { CreateEntityDTO } from '../dto/create-entity.dto';
import { CREATE_ENTITY_SWAGGER } from './create-entity.api-body';

export function CreateEntityDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a entity' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiExtraModels(CreateEntityDTO),
    ApiBody(CREATE_ENTITY_SWAGGER),
  );
}

export function FindByIdEntityDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Retrieve a entity by ID' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function FindAllEntityDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Retrieve all users' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}
