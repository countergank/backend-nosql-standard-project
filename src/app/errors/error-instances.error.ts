import { HttpStatus } from '@nestjs/common';
import { ErrorBase } from '../../common/errors/error-base/error-base';
import { ErrorBaseEnum } from '../../common/errors/error-base/error-base.enums';
import { ErrorCodes, ErrorMessages } from './error.dictionary';

export class AppError extends ErrorBase {
  constructor(e?: unknown) {
    const errorGroup = ErrorBaseEnum.App;
    const code = ErrorCodes.Base;
    const message = ErrorMessages[code];
    const error = e ?? message;
    super(errorGroup, code, error, HttpStatus.INTERNAL_SERVER_ERROR);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class AppVersionNotFoundError extends ErrorBase {
  constructor(e?: unknown) {
    const errorGroup = ErrorBaseEnum.App;
    const code = ErrorCodes.AppVersionNotFound;
    const message = ErrorMessages[code];
    const error = e ?? message;
    super(errorGroup, code, error, HttpStatus.NOT_FOUND);
    Object.setPrototypeOf(this, AppVersionNotFoundError.prototype);
  }
}

export const AppErrors = [new AppError().getErrorPublic(), new AppVersionNotFoundError().getErrorPublic()];
