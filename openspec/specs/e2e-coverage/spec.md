# Spec: E2E Coverage for All Endpoints — COU-225

## Requirements

### Requirement: Microservice endpoint coverage
The e2e suite MUST cover `POST /message-microservice/:pattern`.

#### Scenario: Microservice disabled
- **WHEN** POST /message-microservice/test-pattern with microservice disabled
- **THEN** returns 500 with code APP_ERROR

### Requirement: Complete endpoint coverage
Every server endpoint MUST have at least one e2e test.

#### Scenario: All 9 endpoints covered
- **WHEN** running the e2e suite
- **THEN** all 9 endpoints (/, /health, /message-microservice, /entity/create, /entity, /entity/:id, /admin/parameters, /admin/parameters/:group, /admin/parameters/:key) are exercised
