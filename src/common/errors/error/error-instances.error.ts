import { HttpStatus } from '@nestjs/common';
import { ErrorBase } from '../error-base/error-base';
import { ErrorBaseEnum } from '../error-base/error-base.enums';
import { ErrorCodes, ErrorMessages } from './error.dictionary';

export class GenericError extends ErrorBase {
  constructor(e?: unknown) {
    const errorGroup = ErrorBaseEnum.Common;
    const code = ErrorCodes.Base;
    const message = ErrorMessages[code];
    const error = e ?? message;
    super(errorGroup, code, error, HttpStatus.INTERNAL_SERVER_ERROR);
    Object.setPrototypeOf(this, GenericError.prototype);
  }
}

export const CommonErrors = [new GenericError().getErrorPublic()];
