# Exploration: E2E Tests for All Endpoints — COU-225

## Server Endpoints Inventory
| Controller | Route | Method | Version | E2E covered? |
|-----------|-------|--------|---------|--------------|
| AppController | `/` | GET | neutral | ✅ app.e2e-spec.ts |
| AppController | `/health` | GET | neutral | ✅ app.e2e-spec.ts |
| AppController | `/message-microservice/:pattern` | POST | neutral | ❌ missing |
| EntityController | `/entity/create` | POST | v1 | ✅ entity.e2e-spec.ts |
| EntityController | `/entity` | GET | v1 | ✅ entity.e2e-spec.ts |
| EntityController | `/entity/:id` | GET | v1 | ✅ entity.e2e-spec.ts |
| ParameterAdminController | `/admin/parameters` | GET | v1 | ✅ parameter-admin.e2e-spec.ts |
| ParameterAdminController | `/admin/parameters/:group` | GET | v1 | ✅ parameter-admin.e2e-spec.ts |
| ParameterAdminController | `/admin/parameters/:key` | PUT | v1 | ✅ parameter-admin.e2e-spec.ts |

## Gaps
- `POST /message-microservice/:pattern` has no e2e coverage

## Microservice behavior
`AppService.messageMicroservice` throws `APP_ERROR` (500) when `EXAMPLE_MICROSERVICE_ENABLED !== 'true'` or no client is available. In test/CI environment the microservice is disabled, so the endpoint returns 500 with `code: APP_ERROR`.

## Plan
1. Add microservice endpoint test to app.e2e-spec.ts (done in progress)
2. Verify all endpoints covered
3. Ensure consistency with Fastify adapter + CI env
