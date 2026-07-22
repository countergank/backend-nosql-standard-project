# Proposal: Optimizar testing y hooks (COU-136)

## Intent

Fix critical bug: `npm test` includes `--lastCommit` flag, causing CI, pre-commit, and pre-push hooks to run only 4 of 22 test suites (~30 of 151 tests). Regressions in unchanged code go undetected. Add missing lint-staged integration for Biome on commit.

## Scope

### In Scope
- Remove `--lastCommit` from default `npm test` script
- Add `test:local` script with `--lastCommit` for developer convenience
- Add `lint-staged` + `@biomejs/biome` (already installed) for auto-format/lint on commit
- Simplify pre-commit: lint-staged only (fast feedback)
- Keep pre-push: full test suite (safety gate)
- Add `test:ci` script (full suite, no `--lastCommit`, coverage disabled)

### Out of Scope
- Coverage thresholds and CI coverage upload (future phase)
- Lint/type-check/e2e jobs in CI (future phase)
- E2E test execution in CI (future phase)
- Jest cache optimization for CI

## Capabilities

### New Capabilities
None — this is a fix/configuration change, not new functionality.

### Modified Capabilities
None — no spec-level behavior changes. Pure tooling and script fix.

## Approach

1. **Fix `npm test`**: Remove `--lastCommit` so it runs the full suite
2. **Add `test:local`**: Preserve `--lastCommit` for fast local iteration
3. **Add `test:ci`**: Explicit CI script (full suite, no coverage)
4. **Install `lint-staged`**: Add to devDependencies, configure in `package.json`
5. **Configure Biome in lint-staged**: Format + lint on commit
6. **Simplify pre-commit**: `npx lint-staged` only (no full test run)
7. **Keep pre-push**: Full `npm test` as safety gate

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | Scripts, lint-staged config, devDependencies |
| `.husky/pre-commit` | Modified | Replace `npm test` with `npx lint-staged` |
| `.husky/pre-push` | No change | Already runs `npm test` (now correct) |
| `.github/workflows/ci.yml` | No change | Uses `npm test` (now correct by fix) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Pre-commit slower (lint only, no tests) | Low | Lint is fast; pre-push catches test regressions |
| Developers miss `--lastCommit` locally | Low | Document `test:local` in team convention |
| lint-staged config issues on first commit | Low | Test locally before pushing |

## Rollback Plan

Revert `package.json` scripts and `.husky/pre-commit` to original state. Remove `lint-staged` from devDependencies.

## Dependencies

- `lint-staged` (new devDependency)
- `@biomejs/biome` (already installed, v1.8.3)

## Success Criteria

- [ ] `npm test` runs ALL 22 test suites (not just last commit)
- [ ] `npm run test:local` runs only last commit tests (developer convenience)
- [ ] Pre-commit runs Biome format + lint on staged files
- [ ] Pre-push runs full test suite
- [ ] CI workflow uses correct test script
