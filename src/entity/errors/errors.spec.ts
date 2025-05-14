import { EntityEmailAlreadyExistsError, EntityNameAlreadyExistsError, EntityNotFoundError } from "./error-instances.error";
import { ErrorCodes, ErrorMessages } from "./error.dictionary";


describe(EntityEmailAlreadyExistsError.name, () => {
  it(`should create an instance of ${EntityEmailAlreadyExistsError.name}`, () => {
    const error = new EntityEmailAlreadyExistsError();

    expect(error).toBeInstanceOf(EntityEmailAlreadyExistsError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.EntityEmailAlreadyExists]);
    expect(error.code.includes(ErrorCodes.EntityEmailAlreadyExists)).toBeTruthy();
  });
});

describe(EntityNameAlreadyExistsError.name, () => {
  it(`should create an instance of ${EntityNameAlreadyExistsError.name}`, () => {
    const error = new EntityNameAlreadyExistsError();

    expect(error).toBeInstanceOf(EntityNameAlreadyExistsError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.EntityNameAlreadyExists]);
    expect(error.code.includes(ErrorCodes.EntityNameAlreadyExists)).toBeTruthy();
  });
});

describe(EntityNotFoundError.name, () => {
  it(`should create an instance of ${EntityNotFoundError.name}`, () => {
    const error = new EntityNotFoundError();

    expect(error).toBeInstanceOf(EntityNotFoundError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.EntityNotFound]);
    expect(error.code.includes(ErrorCodes.EntityNotFound)).toBeTruthy();
  });
});
