# Tasks: E2E Tests for All Endpoints — COU-225

## Review Workload Forecast
- **Estimated changed lines**: ~15 (1 test in app.e2e-spec.ts)
- **400-line budget risk**: Low
- **Chained PRs recommended**: No

## Tasks

### 1. Inventory endpoints
- [x] List all 9 server endpoints and their e2e coverage

### 2. Add microservice endpoint test
- [x] Add POST /message-microservice/:pattern test to app.e2e-spec.ts (500 APP_ERROR)

### 3. Verify coverage
- [x] Run e2e suite → 20/20 pass
- [x] Run unit tests → 305 pass
- [x] lint clean
