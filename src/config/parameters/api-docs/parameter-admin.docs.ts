import { applyDecorators } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto';

export function GetAllParametersDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all runtime parameters' }),
    ApiUnauthorizedResponse({ description: 'Invalid or missing x-admin-token', type: ErrorResponseDto }),
  );
}

export function GetParametersByGroupDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Get runtime parameters by group' }),
    ApiUnauthorizedResponse({ description: 'Invalid or missing x-admin-token', type: ErrorResponseDto }),
  );
}

export function UpdateParameterDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a runtime parameter' }),
    ApiUnauthorizedResponse({ description: 'Invalid or missing x-admin-token', type: ErrorResponseDto }),
    ApiNotFoundResponse({ description: 'Parameter is not defined', type: ErrorResponseDto }),
    ApiConflictResponse({ description: 'Parameter is bound to an environment variable', type: ErrorResponseDto }),
    ApiUnprocessableEntityResponse({ description: 'Parameter value failed validation', type: ErrorResponseDto }),
  );
}
