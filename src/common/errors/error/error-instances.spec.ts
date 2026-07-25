import { HttpStatus } from '@nestjs/common';
import { GenericError } from './error-instances.error';
import { ErrorCodes, ErrorMessages } from './error.dictionary';

describe(GenericError.name, () => {
  it(`should create an instance of ${GenericError.name}`, () => {
    const error = new GenericError();

    expect(error).toBeInstanceOf(GenericError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.Base]);
    expect(error.code.includes(ErrorCodes.Base)).toBeTruthy();
  });

  it(`should have default statusCode 500`, () => {
    const error = new GenericError();

    expect(error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it(`should include statusCode in getErrorPublic()`, () => {
    const error = new GenericError();
    const publicError = error.getErrorPublic();

    expect(publicError.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
