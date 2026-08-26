# Tasks: Test Directory Refactor — COU-222

## Review Workload Forecast
- **Estimated changed lines**: ~200 (test files + bug fix)
- **400-line budget risk**: Low
- **Chained PRs recommended**: No

## Tasks

### 1. Remove httpyac
- [x] Delete `test/httpyac/` directory

### 2. Add entity e2e tests
- [x] Create `test/entity.e2e-spec.ts` with CRUD + 409/404 scenarios

### 3. Update app e2e
- [x] Migrate to Fastify adapter
- [x] Add /health test

### 4. Fix existsByName bug
- [x] Rename `existsByName` → `existsByUserName`, query `{ userName }`
- [x] Update service + specs

### 5. Split helpers
- [x] Create `test/helpers/mock.ts` (Mock)
- [x] Create `test/helpers/mongo.ts` (mongo helpers)
- [x] Remove barrel index.ts

### 6. Verify
- [x] `npm test` → 305 pass
- [x] e2e → 19 pass
- [x] lint clean
