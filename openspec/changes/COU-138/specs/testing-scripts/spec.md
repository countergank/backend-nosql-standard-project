# Delta for Testing Scripts

## MODIFIED Requirements

### Requirement: Default Test Script Runs Full Suite

The `npm test` script SHALL run ALL test suites without the `--lastCommit` flag.
(Previously: Had a scenario stating CI uses `npm test` — CI now uses `test:ci`)

#### Scenario: npm test runs complete test suite

- GIVEN a developer runs `npm test`
- WHEN Jest executes
- THEN all test suites run
- AND no `--lastCommit` filter is applied

### Requirement: CI Script Without Coverage

The `test:ci` script SHALL run the full test suite without coverage collection.
(Previously: Did not explicitly state CI must use this script over `npm test`)

#### Scenario: test:ci runs full suite without coverage

- GIVEN CI runs `npm run test:ci`
- WHEN Jest executes
- THEN all test suites run
- AND `--collectCoverage=false` is set
- AND `--forceExit` prevents open handle hangs

#### Scenario: CI uses test:ci instead of npm test

- GIVEN the CI test job triggers
- WHEN Jest runs via `npm run test:ci`
- THEN tests run without `--maxWorkers` throttling
- AND full parallelism is available
