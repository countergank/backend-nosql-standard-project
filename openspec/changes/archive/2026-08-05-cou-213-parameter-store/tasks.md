# Tasks: COU-213 — Parameter Store Runtime Configuration Management

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450-500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Parameter types + registry infrastructure | PR 1 | "npm run test:ci src/config/parameters" | N/A | Registry (reg, def, entry types) + registry.ts |
| 2 | ParameterStore + L1/Redis/EventEmitter | PR 2 | "npm run test:ci src/config/parameters/parameter.store.spec.ts" | `ICACHE_SERVICE.set('param:ENTITY_CACHE_TTL_MS', 60000, 300000)` | Store (get/set/delete) + redis integration |
| 3 | ParameterService + static instance + lifecycle | PR 3 | "npm run test:ci src/config/parameters/parameter.service.spec.ts" | `ParameterService.get('ENTITY_CACHE_TTL_MS')` returns 60000 | Service (CRUD) + registry integration |
| 4 | @Parameter decorator + extract helper | PR 4 | "npm run test:ci src/config/parameters/decorators/parameter.decorator.spec.ts" | `@Parameter('ENTITY_CACHE_TTL_MS')` injection | Decorator + helper (injection logic) |
| 5 | Admin guard + token header validation | PR 5 | "npm run test:ci src/config/parameters/parameter-admin.guard.spec.ts" | `GET /v1/admin/parameters` with invalid `x-admin-token` | Guard + WWW-Authenticate header on auth failure |
| 6 | Admin controller + error mapping | PR 6 | "npm run test:ci src/config/parameters/parameter-admin.controller.spec.ts" | `PUT /v1/admin/parameters/ENTITY_CACHE_TTL_MS` with valid token | Controller + 404/409/422 mapping via DomainError.fromKind |
| 7 | Admin module integration | PR 7 | "npm run test:ci src/config/parameters/parameter-admin.module.spec.ts" | Admin endpoints serve correctly | Module wiring + controller imports |
| 8 | EntityService integration + fallback | PR 8 | "npm run test:src/entity/service/entity.service.spec.ts" | `@Parameter('ENTITY_CACHE_TTL_MS')` uses injected value | EntityService (decorator usage) + fallback handling |
| 9 | Env validation + .env.example | PR 9 | "npm run lint src/config/env.validation.ts" | N/A | Env validation + env example documentation |
| 10 | AppModule + EventEmitter integration | PR 10 | "npm run lint src/app/app.module.ts" | N/A | App module + ParameterModule imports |
| 11 | E2E admin API tests | PR 11 | "npm run test:e2e" | Supertest + real AppModule | All admin endpoints + error envelopes |

## Phase 1: Foundation / Infrastructure

- [x] 1.1 Add `@nestjs/event-emitter` dependency to package.json
- [x] 1.2 Enhance `DomainError` with optional `status?: number` parameter and `PARAMETER_*` error kinds (404, 409, 422)
- [x] 1.3 Create `src/config/parameters/parameter.types.ts` with `ParameterType`, `ParameterDefinition`, `ParameterEntry`, `ParameterDecoratorOptions`
- [x] 1.4 Create `src/config/parameters/parameter-definitions.ts` with `ENTITY_CACHE_TTL_MS` seed (group `cache`, number, default 30000, ttl 300000, positive-number validation)
- [x] 1.5 Create `src/config/parameters/parameter-registry.ts` with registry class (register/find/validate/getDefault/getTTL/has/getAll/findByGroup/listGroups)

## Phase 2: Core Implementation

- [x] 2.1 Create `src/config/parameters/parameter.store.ts` with L1 Map + ICACHE_SERVICE + env override + @Optional() EventEmitter2
- [x] 2.2 Create `src/config/parameters/parameter.service.ts` with get/set/getAll/getByGroup/has/delete + static instance + ensureInitialized() + OnApplicationBootstrap
- [x] 2.3 Create `src/config/parameters/decorators/extract-parameter.helper.ts` with extractParameter factory
- [x] 2.4 Create `src/config/parameters/decorators/parameter.decorator.ts` with @Parameter decorator using createParamDecorator
- [x] 2.5 Create `src/config/parameters/decorators/index.ts` barrel export for decorators

## Phase 3: Admin Layer

- [x] 3.1 Create `src/config/parameters/dto/update-parameter.dto.ts` with UpdateParameterDto (value: string, @IsString() @IsNotEmpty())
- [x] 3.2 Create `src/config/parameters/dto/parameter-entry.dto.ts` with ParameterEntryDto for admin API responses
- [x] 3.3 Create `src/config/parameters/api-docs/parameter-admin.docs.ts` with Swagger decorators for admin endpoints
- [x] 3.4 Create `src/config/parameters/parameter-admin.guard.ts` with AdminApiKeyGuard reading x-admin-token header and validating against ADMIN_API_TOKEN
- [x] 3.5 Create `src/config/parameters/parameter-admin.controller.ts` with @Controller({ path: 'admin/parameters', version: '1' }) and GET /, GET /:group, PUT /:key
- [x] 3.6 Create `src/config/parameters/parameter-admin.module.ts` importing ParameterModule and declaring ParameterAdminController
- [x] 3.7 Create `src/config/parameters/parameter.module.ts` dynamic module global: true with registry, store, service providers and exports
- [x] 3.8 Create `src/config/parameters/index.ts` barrel export

## Phase 4: Integration

- [x] 4.1 Modify `src/entity/service/entity.service.ts` to use @Parameter('ENTITY_CACHE_TTL_MS') cacheTtlMs with fallback to 30000
- [x] 4.2 Modify `src/config/env.validation.ts` to add optional ADMIN_API_TOKEN string
- [x] 4.3 Modify `src/app/app.module.ts` to import ParameterModule.forRoot(), ParameterAdminModule, EventEmitterModule.forRoot()
- [x] 4.4 Modify package.json to add @nestjs/event-emitter dependency
- [x] 4.5 Modify .env.example to document ADMIN_API_TOKEN and ENTITY_CACHE_TTL_MS pattern

## Phase 5: Testing / Verification

- [x] 5.1 Unit tests for parameter-registry.ts (register, duplicate rejection, type validation, group queries, getDefault/getTTL/has)
- [x] 5.2 Unit tests for parameter.store.ts (L1 hit/miss/expire, env override coercion, ICACHE_SERVICE delegation, Redis seed default, graceful degradation, L1 invalidation, event emission)
- [x] 5.3 Unit tests for parameter.service.ts (get/set/getAll/getByGroup/has/delete integration, validation enforcement, static instance lifecycle)
- [x] 5.4 Unit tests for parameter.decorator.ts + extract-parameter.helper.ts (strict/non-strict mode, ensureInitialized throws, injection)
- [x] 5.5 Unit tests for parameter-admin.guard.ts (valid token → true, missing/invalid token → 401 + WWW-Authenticate, missing ADMIN_API_TOKEN env → 401)
- [x] 5.6 Unit tests for parameter-admin.controller.ts (GET all, GET by group, PUT success, PUT 404, PUT 409, PUT 422 via DomainError.fromKind)
- [x] 5.7 Integration tests with real ParameterModule for read/write flow
- [x] 5.8 E2E tests for admin API (supertest + real AppModule): 401 + WWW-Authenticate, GET all, GET by group, PUT success + event, 404/409/422 envelopes — written; local run blocked by pre-existing e2e environment (Mongo server-selection timeout, stash-verified), runs in CI
- [x] 5.9 EntityService integration tests with @Parameter decorator
- [x] 5.10 Run full test suite: npm run lint / test:ci — lint clean, unit 305 passed / 34 suites, build type-check clean (dist/ root-owned, verified via alternate outDir)

## Implementation Order

1. Phase 1 (Foundation) must complete first to provide the type definitions and registry that subsequent phases depend on
2. Phase 2 (Core Implementation) depends on Phase 1 registry and infrastructure
3. Phase 3 (Admin Layer) depends on Phase 2 services and decorators
4. Phase 4 (Integration) modifies existing files to use the new parameter system
5. Phase 5 (Testing) validates all components and integration points

All tasks follow TDD: RED test first → GREEN implementation → REFACTOR cleanup.

Review Workload Forecast:

| Field | Value |
|-------|-------|
| Estimated changed lines | 450-500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High