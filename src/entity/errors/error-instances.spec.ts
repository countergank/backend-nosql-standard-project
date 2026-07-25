import { HttpStatus } from '@nestjs/common';
import {
  EntityEmailAlreadyExistsError,
  EntityError,
  EntityNameAlreadyExistsError,
  EntityNotFoundError,
  EntityPopulateError,
} from './error-instances.error';
import { ErrorCodes, ErrorMessages } from './error.dictionary';

describe(EntityError.name, () => {
  it(`should create an instance of ${EntityError.name}`, () => {
    const error = new EntityError();

    expect(error).toBeInstanceOf(EntityError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.Base]);
    expect(error.code.includes(ErrorCodes.Base)).toBeTruthy();
  });

  it(`should have default statusCode 500`, () => {
    const error = new EntityError();

    expect(error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});

describe(EntityEmailAlreadyExistsError.name, () => {
  it(`should create an instance of ${EntityEmailAlreadyExistsError.name}`, () => {
    const error = new EntityEmailAlreadyExistsError();

    expect(error).toBeInstanceOf(EntityEmailAlreadyExistsError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.EntityEmailAlreadyExists]);
    expect(error.code.includes(ErrorCodes.EntityEmailAlreadyExists)).toBeTruthy();
  });

  it(`should have default statusCode 409`, () => {
    const error = new EntityEmailAlreadyExistsError();

    expect(error.statusCode).toBe(HttpStatus.CONFLICT);
  });

  it(`should include statusCode in getErrorPublic()`, () => {
    const error = new EntityEmailAlreadyExistsError();
    const publicError = error.getErrorPublic();

    expect(publicError.statusCode).toBe(HttpStatus.CONFLICT);
  });
});

describe(EntityNameAlreadyExistsError.name, () => {
  it(`should create an instance of ${EntityNameAlreadyExistsError.name}`, () => {
    const error = new EntityNameAlreadyExistsError();

    expect(error).toBeInstanceOf(EntityNameAlreadyExistsError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.EntityNameAlreadyExists]);
    expect(error.code.includes(ErrorCodes.EntityNameAlreadyExists)).toBeTruthy();
  });

  it(`should have default statusCode 409`, () => {
    const error = new EntityNameAlreadyExistsError();

    expect(error.statusCode).toBe(HttpStatus.CONFLICT);
  });

  it(`should include statusCode in getErrorPublic()`, () => {
    const error = new EntityNameAlreadyExistsError();
    const publicError = error.getErrorPublic();

    expect(publicError.statusCode).toBe(HttpStatus.CONFLICT);
  });
});

describe(EntityNotFoundError.name, () => {
  it(`should create an instance of ${EntityNotFoundError.name}`, () => {
    const error = new EntityNotFoundError();

    expect(error).toBeInstanceOf(EntityNotFoundError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.EntityNotFound]);
    expect(error.code.includes(ErrorCodes.EntityNotFound)).toBeTruthy();
  });

  it(`should have default statusCode 404`, () => {
    const error = new EntityNotFoundError();

    expect(error.statusCode).toBe(HttpStatus.NOT_FOUND);
  });

  it(`should include statusCode in getErrorPublic()`, () => {
    const error = new EntityNotFoundError();
    const publicError = error.getErrorPublic();

    expect(publicError.statusCode).toBe(HttpStatus.NOT_FOUND);
  });
});

describe(EntityPopulateError.name, () => {
  it(`should create an instance of ${EntityPopulateError.name}`, () => {
    const error = new EntityPopulateError();

    expect(error).toBeInstanceOf(EntityPopulateError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.EntityPopulate]);
    expect(error.code.includes(ErrorCodes.EntityPopulate)).toBeTruthy();
  });

  it(`should have default statusCode 500`, () => {
    const error = new EntityPopulateError();

    expect(error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it(`should include statusCode in getErrorPublic()`, () => {
    const error = new EntityPopulateError();
    const publicError = error.getErrorPublic();

    expect(publicError.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
