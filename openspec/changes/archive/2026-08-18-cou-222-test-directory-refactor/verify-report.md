# Verify Report: Test Directory Refactor — COU-222

## Summary
- Removed `test/httpyac/` (redundant `GET /` request)
- Added `test/entity.e2e-spec.ts` (8 tests: CRUD + 409/404 scenarios)
- Updated `test/app.e2e-spec.ts` (Fastify adapter + `/health` test)
- **Fixed production bug**: `existsByName` checked `{ name }` instead of `{ userName }`

## Bug Found
`EntityRepository.existsByName` queried `{ name }` but `EntityService.create` passed `userName`. Duplicate usernames were not caught by the pre-check, causing a MongoDB E11000 duplicate key error (500) instead of the intended 409 `ENTITY_NAME_ALREADY_EXISTS`. Renamed to `existsByUserName` and fixed the query.

## Verification
- Unit tests: 305 passed, 3 skipped, 0 failed
- E2E tests: 19 passed (3 suites), 0 failed
- Lint (src + test): clean
