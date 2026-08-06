# CI Pipeline Specification

## Purpose

GitHub Actions CI workflow validating code quality, compilation, unit tests, and e2e tests for every pull request targeting `main` or `develop`.

## Requirements

### Requirement: PR Trigger on Protected Branches

The CI workflow SHALL trigger on pull requests targeting `main` or `develop`.

#### Scenario: PR triggers all CI jobs

- GIVEN a pull request targets `main` or `develop`
- WHEN the PR opens or updates
- THEN all CI jobs execute

### Requirement: Biome Lint Job

The CI workflow SHALL include a `lint` job running Biome with `--diagnostic-level=error`.

#### Scenario: Lint passes on clean code

- GIVEN a PR passes Biome checks
- WHEN the `lint` job runs
- THEN the job succeeds

#### Scenario: Lint fails on violations

- GIVEN a PR has Biome lint errors
- WHEN the `lint` job runs
- THEN the job fails and reports violations

### Requirement: Build Verification Job

The CI workflow SHALL include a `build` job running `npm run build` to verify TypeScript compilation.

#### Scenario: Build succeeds on valid code

- GIVEN a PR has valid TypeScript
- WHEN the `build` job runs `npm run build`
- THEN compilation completes without errors

### Requirement: Test Job Uses test:ci

The CI test job SHALL run `npm run test:ci` instead of `npm test` to avoid worker throttling.

#### Scenario: Tests run without maxWorkers restriction

- GIVEN the `test` job executes
- WHEN Jest runs via `npm run test:ci`
- THEN all test suites run without `--maxWorkers` throttling

### Requirement: E2E Tests with MongoDB Service

The CI workflow SHALL include an `e2e` job with a MongoDB service container.

#### Scenario: E2E tests connect to service MongoDB

- GIVEN the `e2e` job starts a MongoDB service container on port 27017
- WHEN `npm run test:e2e` executes
- THEN tests connect to the container and complete

### Requirement: Parallel Job Execution

All CI jobs (commitlint, lint, build, test, e2e) SHALL run in parallel, not sequentially.

#### Scenario: Jobs execute concurrently

- GIVEN the CI workflow triggers
- WHEN jobs start
- THEN lint, build, test, and e2e jobs run simultaneously

### Requirement: CI Config Testability

The CI configuration file SHALL remain valid against existing `ci-doppler.spec.ts` assertions after all changes.

#### Scenario: Config test matches updated workflow

- GIVEN `ci-doppler.spec.ts` reads `.github/workflows/ci.yml`
- WHEN Jest runs the config test
- THEN all assertions pass against the updated structure
