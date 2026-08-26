# Git Hooks Specification

## Purpose

Define the behavior of Husky git hooks for pre-commit and pre-push validation.

## Requirements

### Requirement: Pre-Commit Hook Runs Lint Only

The pre-commit hook SHALL execute `npx lint-staged` instead of running the full test suite.

#### Scenario: pre-commit runs lint-staged

- GIVEN a developer commits staged files
- WHEN the pre-commit hook triggers
- THEN `npx lint-staged` executes
- AND only staged files are formatted and linted
- AND commit proceeds if lint passes

#### Scenario: pre-commit blocks on lint errors

- GIVEN a developer commits files with lint errors
- WHEN the pre-commit hook triggers
- THEN `npx lint-staged` detects errors
- AND the commit is blocked
- AND error messages display

### Requirement: Pre-Push Hook Runs Full Test Suite

The pre-push hook SHALL execute `npm test` to run all test suites before push.

#### Scenario: pre-push runs full test suite

- GIVEN a developer pushes commits
- WHEN the pre-push hook triggers
- THEN `npm test` executes
- AND all 22 test suites run
- AND push proceeds if all tests pass

#### Scenario: pre-push blocks on test failure

- GIVEN a developer pushes commits with failing tests
- WHEN the pre-push hook triggers
- THEN `npm test` detects failures
- AND the push is blocked
- AND failure output displays

### Requirement: Commit Message Validation

The commit-msg hook SHALL continue to run commitlint with conventional config.

#### Scenario: commit-msg validates conventional format

- GIVEN a developer commits with message
- WHEN the commit-msg hook triggers
- THEN commitlint validates format
- AND non-conventional messages are rejected
