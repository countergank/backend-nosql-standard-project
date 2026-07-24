import {
  EntityEmailAlreadyExistsError,
  EntityError,
  EntityNameAlreadyExistsError,
  EntityNotFoundError,
  EntityPopulateError,
} from './error-instances.error';
import { ErrorCodes, ErrorMessages } from './error.dictionary';

describe(EntityError.name, () => {
  it(`should create en instance of ${EntityError.name}`, () => {
    const error = new EntityError();

    expect(error).toBeInstanceOf(EntityError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.Base]);
    expect(error.code.includes(ErrorCodes.Base)).toBeTruthy();
  });
});

describe(EntityEmailAlreadyExistsError.name, () => {
  it(`should create en instance of ${EntityEmailAlreadyExistsError.name}`, () => {
    const error = new EntityEmailAlreadyExistsError();

    expect(error).toBeInstanceOf(EntityEmailAlreadyExistsError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.EntityEmailAlreadyExists]);
    expect(error.code.includes(ErrorCodes.EntityEmailAlreadyExists)).toBeTruthy();
  });
});

describe(EntityNameAlreadyExistsError.name, () => {
  it(`should create en instance of ${EntityNameAlreadyExistsError.name}`, () => {
    const error = new EntityNameAlreadyExistsError();

    expect(error).toBeInstanceOf(EntityNameAlreadyExistsError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.EntityNameAlreadyExists]);
    expect(error.code.includes(ErrorCodes.EntityNameAlreadyExists)).toBeTruthy();
  });
});

describe(EntityNotFoundError.name, () => {
  it(`should create en instance of ${EntityNotFoundError.name}`, () => {
    const error = new EntityNotFoundError();

    expect(error).toBeInstanceOf(EntityNotFoundError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.EntityNotFound]);
    expect(error.code.includes(ErrorCodes.EntityNotFound)).toBeTruthy();
  });
});

describe(EntityPopulateError.name, () => {
  it(`should create en instance of ${EntityPopulateError.name}`, () => {
    const error = new EntityPopulateError();

    expect(error).toBeInstanceOf(EntityPopulateError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.EntityPopulate]);
    expect(error.code.includes(ErrorCodes.EntityPopulate)).toBeTruthy();
  });
});
