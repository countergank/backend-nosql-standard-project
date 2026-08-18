# Exploration: Test Directory Refactor — COU-222

## Current State
- `test/httpyac/main/main.http` — single `GET /` request, redundant with `app.e2e-spec.ts`
- `test/app.e2e-spec.ts` — tests `GET /` (version endpoint)
- `test/parameter-admin.e2e-spec.ts` — 11 tests covering admin API
- `test/helpers/index.ts` — Mock, MongoMemoryServer helpers
- `test/jest-e2e.json` — e2e config

## Gaps
- No e2e coverage for Entity endpoints (`POST /entity/create`, `GET /entity`, `GET /entity/:id`)
- No e2e coverage for `/health`
- httpyac file is dead weight

## Server Endpoints (from AppModule routes)
| Controller | Routes | E2E coverage |
|-----------|--------|--------------|
| AppController | `GET /`, `GET /health` | `/` yes, `/health` no |
| ParameterAdminController | `/admin/parameters` GET/PUT | ✅ full |
| EntityController | `/entity/create`, `/entity`, `/entity/:id` | ❌ none |

## Plan
1. Remove `test/httpyac/` (redundant)
2. Add `test/entity.e2e-spec.ts` — CRUD + 409/404 scenarios
3. Add `/health` test to `app.e2e-spec.ts`
4. Reuse `test/helpers/` for Mongo connection
