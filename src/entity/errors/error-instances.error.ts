import { HttpStatus } from '@nestjs/common';
import { ErrorBase } from '../../common/errors/error-base/error-base';
import { ErrorBaseEnum } from '../../common/errors/error-base/error-base.enums';
import { ErrorCodes, ErrorMessages } from './error.dictionary';

export class EntityError extends ErrorBase {
  constructor(e?: unknown) {
    const errorGroup = ErrorBaseEnum.Entity;
    const code = ErrorCodes.Base;
    const message = ErrorMessages[code];
    const error = e ?? message;
    super(errorGroup, code, error, HttpStatus.INTERNAL_SERVER_ERROR);
    Object.setPrototypeOf(this, EntityError.prototype);
  }
}

export class EntityEmailAlreadyExistsError extends ErrorBase {
  constructor(e?: unknown) {
    const errorGroup = ErrorBaseEnum.Entity;
    const code = ErrorCodes.EntityEmailAlreadyExists;
    const message = ErrorMessages[code];
    const error = e ?? message;
    super(errorGroup, code, error, HttpStatus.CONFLICT);
    Object.setPrototypeOf(this, EntityEmailAlreadyExistsError.prototype);
  }
}

export class EntityNameAlreadyExistsError extends ErrorBase {
  constructor(e?: unknown) {
    const errorGroup = ErrorBaseEnum.Entity;
    const code = ErrorCodes.EntityNameAlreadyExists;
    const message = ErrorMessages[code];
    const error = e ?? message;
    super(errorGroup, code, error, HttpStatus.CONFLICT);
    Object.setPrototypeOf(this, EntityNameAlreadyExistsError.prototype);
  }
}

export class EntityNotFoundError extends ErrorBase {
  constructor(e?: unknown) {
    const errorGroup = ErrorBaseEnum.Entity;
    const code = ErrorCodes.EntityNotFound;
    const message = ErrorMessages[code];
    const error = e ?? message;
    super(errorGroup, code, error, HttpStatus.NOT_FOUND);
    Object.setPrototypeOf(this, EntityNotFoundError.prototype);
  }
}

export class EntityPopulateError extends ErrorBase {
  constructor(e?: unknown) {
    const errorGroup = ErrorBaseEnum.Entity;
    const code = ErrorCodes.EntityPopulate;
    const message = ErrorMessages[code];
    const error = e ?? message;
    super(errorGroup, code, error, HttpStatus.INTERNAL_SERVER_ERROR);
    Object.setPrototypeOf(this, EntityPopulateError.prototype);
  }
}

export const EntityErrors = [
  new EntityError().getErrorPublic(),
  new EntityEmailAlreadyExistsError().getErrorPublic(),
  new EntityNameAlreadyExistsError().getErrorPublic(),
  new EntityNotFoundError().getErrorPublic(),
  new EntityPopulateError().getErrorPublic(),
];
