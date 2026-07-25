import { HttpStatus } from '@nestjs/common';
import { AppError, AppVersionNotFoundError } from './error-instances.error';
import { ErrorCodes, ErrorMessages } from './error.dictionary';

describe(AppError.name, () => {
  it(`should create an instance of ${AppError.name}`, () => {
    const error = new AppError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.Base]);
    expect(error.code.includes(ErrorCodes.Base)).toBeTruthy();
  });

  it(`should have default statusCode 500`, () => {
    const error = new AppError();

    expect(error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it(`should include statusCode in getErrorPublic()`, () => {
    const error = new AppError();
    const publicError = error.getErrorPublic();

    expect(publicError.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});

describe(AppVersionNotFoundError.name, () => {
  it(`should create an instance of ${AppVersionNotFoundError.name}`, () => {
    const error = new AppVersionNotFoundError();

    expect(error).toBeInstanceOf(AppVersionNotFoundError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.AppVersionNotFound]);
    expect(error.code.includes(ErrorCodes.AppVersionNotFound)).toBeTruthy();
  });

  it(`should have default statusCode 404`, () => {
    const error = new AppVersionNotFoundError();

    expect(error.statusCode).toBe(HttpStatus.NOT_FOUND);
  });

  it(`should include statusCode in getErrorPublic()`, () => {
    const error = new AppVersionNotFoundError();
    const publicError = error.getErrorPublic();

    expect(publicError.statusCode).toBe(HttpStatus.NOT_FOUND);
  });
});
