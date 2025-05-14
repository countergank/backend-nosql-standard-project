export enum ErrorCodes {
  Base = '000',
  EntityNotFound = '001',
  EntityNameAlreadyExists = '002',
  EntityEmailAlreadyExists = '003',
  EntityPopulate = '004',
}

export enum ErrorMessages {
  '000' = 'Error en Entity.',
  '001' = 'Error Entity, al obtener el registro.',
  '002' = 'Error Entity, el nombre ya existe.',
  '003' = 'Error Entity, el email ya existe.',
  '004' = 'Error Entity, al poblar base de datos.',
}
