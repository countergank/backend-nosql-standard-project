# Tasks: Add Scalar API Documentation Viewer — COU-218

## Review Workload Forecast
- **Estimated changed lines**: ~10 (package.json +1, main.ts +4)
- **400-line budget risk**: Low
- **Chained PRs recommended**: No
- **Decision needed before apply**: No

## Tasks

### 1. Install Scalar package
- [x] `npm install @scalar/nestjs-api-reference`
- **Commit**: `chore(deps): add @scalar/nestjs-api-reference for API docs viewer`
- **Files**: `package.json`, `package-lock.json`

### 2. Register Scalar middleware in main.ts
- [x] Import `apiReference` from `@scalar/nestjs-api-reference`
- [x] Add `app.use('/reference', apiReference({ spec: { content: swaggerDocument } }))` after `SwaggerModule.createDocument()`
- **Commit**: `feat(docs): add Scalar API reference viewer at /reference`
- **Files**: `src/main.ts`

### 3. Verify existing Swagger UI
- [x] Start app — confirm `GET /docs` returns Swagger UI unchanged
- [x] Confirm `GET /reference` returns Scalar interactive UI
- **Manual verification only**

### 4. Run test suite
- [x] `npm test` — 305 passed, 3 skipped, 0 failures
- [x] `npm run lint` — clean
- **Automated verification**

### 5. Final verification
- [x] Scalar renders all endpoints from OpenAPI spec
- [x] No route conflicts between /docs and /reference
- **Manual verification**
