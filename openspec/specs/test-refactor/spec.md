# Spec: Test Directory Refactor — COU-222

## Requirements

### Requirement: Entity e2e coverage
The e2e suite MUST cover entity CRUD endpoints with real MongoDB.

#### Scenario: Create entity
- **WHEN** POST /v1/entity/create with valid payload
- **THEN** returns 201 with the created entity (no password in response)

#### Scenario: Duplicate email
- **WHEN** POST /v1/entity/create with an existing email
- **THEN** returns 409 ENTITY_EMAIL_ALREADY_EXISTS

#### Scenario: Duplicate userName
- **WHEN** POST /v1/entity/create with an existing userName
- **THEN** returns 409 ENTITY_NAME_ALREADY_EXISTS

#### Scenario: Invalid email
- **WHEN** POST /v1/entity/create with invalid email
- **THEN** returns 422

#### Scenario: Find all
- **WHEN** GET /v1/entity
- **THEN** returns array of entities

#### Scenario: Find by id
- **WHEN** GET /v1/entity/:id
- **THEN** returns the entity

#### Scenario: Not found
- **WHEN** GET /v1/entity/:nonexistent-id
- **THEN** returns 404 ENTITY_NOT_FOUND

### Requirement: Health endpoint coverage
The e2e suite MUST cover the /health endpoint.

#### Scenario: Health check
- **WHEN** GET /health
- **THEN** returns 200 with { status: ok, services: { mongodb: ... } }

### Requirement: httpyac removal
httpyac files MUST be removed from the test directory.

#### Scenario: No httpyac files
- **WHEN** searching for httpyac files
- **THEN** none exist (redundant with app.e2e-spec.ts)

### Requirement: Helper functions organization
Helpers MUST be organized in dedicated files (mock.ts, mongo.ts) with no barrel index.

#### Scenario: Direct imports
- **WHEN** importing helpers
- **THEN** imports use test/helpers/mock and test/helpers/mongo directly

### Requirement: userName uniqueness fix
EntityService MUST check userName (not name) for duplicate detection.

#### Scenario: Duplicate userName detected
- **WHEN** creating entity with existing userName
- **THEN** returns 409 (not MongoDB E11000 / 500)
