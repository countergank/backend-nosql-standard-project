# Testing Scripts Specification

## Purpose

Define the npm test scripts and their behavior for running Jest test suites across different contexts (CI, local development, coverage).

## Requirements

### Requirement: Default Test Script Runs Full Suite

The `npm test` script SHALL run ALL test suites without the `--lastCommit` flag.

#### Scenario: npm test runs complete test suite

- GIVEN a developer runs `npm test`
- WHEN Jest executes
- THEN all 22 test suites execute
- AND all 151 unit tests run
- AND no `--lastCommit` filter is applied

#### Scenario: CI uses npm test for full coverage

- GIVEN CI workflow runs `npm test`
- WHEN Jest executes in GitHub Actions
- THEN all test suites run
- AND regressions in unchanged code are detected

### Requirement: Local Development Script for Fast Iteration

The `test:local` script SHALL run only tests related to the last commit using `--lastCommit`.

#### Scenario: test:local runs last commit tests only

- GIVEN a developer runs `npm run test:local`
- WHEN Jest executes
- THEN only tests changed in the last commit run
- AND execution completes faster than full suite

### Requirement: CI Script Without Coverage

The `test:ci` script SHALL run the full test suite without coverage collection.

#### Scenario: test:ci runs full suite without coverage

- GIVEN CI runs `npm run test:ci`
- WHEN Jest executes
- THEN all test suites run
- AND `--collectCoverage=false` is set
- AND `--forceExit` prevents open handle hangs

### Requirement: Existing Scripts Preserve Behavior

The `test:cov` and `test:e2e` scripts SHALL retain their current configuration.

#### Scenario: test:cov enables coverage

- GIVEN a developer runs `npm run test:cov`
- WHEN Jest executes
- THEN coverage collection is enabled
- AND `--coverage` flag is present

#### Scenario: test:e2e uses separate config

- GIVEN a developer runs `npm run test:e2e`
- WHEN Jest executes
- THEN `./test/jest-e2e.json` config is used
- AND only e2e tests run
