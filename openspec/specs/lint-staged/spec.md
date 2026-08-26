# Lint-Staged Specification

## Purpose

Define the lint-staged configuration for automatic Biome formatting and linting on staged files during commit.

## Requirements

### Requirement: Lint-Staged Installed as DevDependency

The `lint-staged` package SHALL be installed as a devDependency.

#### Scenario: lint-staged available in node_modules

- GIVEN the project is cloned
- WHEN `npm install` runs
- THEN `lint-staged` is available
- AND `@biomejs/biome` is already installed (existing)

### Requirement: Lint-Staged Configured in package.json

The lint-staged configuration SHALL be defined in `package.json` under the `lint-staged` key.

#### Scenario: lint-staged runs Biome on staged files

- GIVEN a developer stages files and commits
- WHEN lint-staged executes
- THEN Biome runs format and lint on each staged file
- AND files are auto-fixed when possible
- AND errors are reported for unfixable issues

#### Scenario: lint-staged handles multiple file types

- GIVEN a developer stages .ts, .js, and .json files
- WHEN lint-staged executes
- THEN Biome processes all staged file types
- AND each file type receives appropriate linting rules

### Requirement: Biome Configuration Referenced

Lint-staged SHALL use the existing `biome.json` configuration.

#### Scenario: lint-staged uses project biome config

- GIVEN lint-staged runs Biome
- WHEN Biome processes files
- THEN `biome.json` rules apply
- AND project-specific formatting and linting standards are enforced
