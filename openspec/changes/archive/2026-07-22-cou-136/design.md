# Design: Optimizar testing y hooks (COU-136)

## Technical Approach

Fix the critical `--lastCommit` bug in `npm test` and add lint-staged + Biome integration for pre-commit. The change is purely configuration — no application code changes. All 4 affected files are tooling configs: `package.json` (scripts + lint-staged config + devDeps), `.husky/pre-commit` (hook content), and the existing CI workflow benefits automatically from the `npm test` fix.

## Architecture Decisions

### Decision: Remove `--lastCommit` from default `test` script

**Choice**: Strip `--lastCommit` from `npm test` — it becomes the full-suite entrypoint.

**Alternatives considered**:
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Remove from `test`, add `test:local` | CI and hooks get full suite; devs opt-in to fast mode | ✅ Chosen |
| Keep `--lastCommit`, fix CI to use `test:ci` | CI safe, but hooks still broken; inconsistent scripts | ❌ Rejected |
| Conditional flag via env var | Over-engineered; unclear when to use `--lastCommit` | ❌ Rejected |

**Rationale**: The default `npm test` must be the "safe" option. `--lastCommit` is a developer convenience, not a correctness default. CI, hooks, and any other consumer should get the full suite unless they explicitly opt out.

### Decision: lint-staged config inline in package.json

**Choice**: Define `lint-staged` config inside `package.json` under the `lint-staged` key.

**Alternatives considered**:
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline in package.json | Single source of truth; fewer files | ✅ Chosen |
| `.lintstagedrc.json` | Separate file; cleaner package.json | ❌ Rejected — adds file for 3 lines |

**Rationale**: The config is 3 lines (`*.{ts,js,json}` → `biome --write`). Separate file adds noise for no benefit. The project already keeps jest config in package.json.

### Decision: lint-staged runs `biome --write --no-errors-on-unmatched`

**Choice**: Use `npx biome check --write --no-errors-on-unmatched` for staged files.

**Alternatives considered**:
| Option | Tradeoff | Decision |
|--------|----------|----------|
| `biome check --write` | Format + lint + auto-fix; fails on unfixable errors | ✅ Chosen |
| Separate format + lint steps | Two commands; slower; same result | ❌ Rejected |
| `biome format --write` only | Misses lint errors; half the value | ❌ Rejected |

**Rationale**: `biome check` combines format + lint + import organize in one pass. `--write` auto-fixes what it can. The existing `biome.json` rules apply automatically.

### Decision: pre-commit = lint-staged only, pre-push = full test suite

**Choice**: pre-commit runs lint-staged (fast, ~1-3s); pre-push runs `npm test` (full suite, ~30s+).

**Alternatives considered**:
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Lint on commit, tests on push | Fast commit flow; safety on push | ✅ Chosen |
| Tests on both commit + push | Slow commits; redundant safety | ❌ Rejected |
| Lint on commit only (no push tests) | No regression gate | ❌ Rejected |

**Rationale**: Pre-commit should be fast (developers commit frequently). Lint catches style issues immediately. Pre-push is the safety gate for correctness. This is the industry-standard split.

### Decision: Add explicit `test:ci` script

**Choice**: `test:ci` = full suite, `--collectCoverage=false`, `--forceExit`.

**Alternatives considered**:
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Explicit `test:ci` script | CI intent is clear; `npm test` stays generic | ✅ Chosen |
| CI just uses `npm test` | Works after fix; but no CI-specific flags | ❌ Rejected |
| CI uses `test:cov` | Enables coverage; not wanted yet (out of scope) | ❌ Rejected |

**Rationale**: Even though `npm test` is now correct, an explicit `test:ci` makes the CI contract visible and allows future CI-specific flags without breaking the developer experience of `npm test`.

## Data Flow

```
Developer Commit Flow:
  git commit
    → pre-commit hook
    → npx lint-staged
    → biome check --write on staged files
    → auto-fix formatting, fail on unfixable lint errors
    → commit proceeds or blocks

Developer Push Flow:
  git push
    → pre-push hook
    → npm test (full suite, 22 suites, 151 tests)
    → all pass → push proceeds
    → any fail → push blocks

CI Flow (GitHub Actions):
  PR opened/updated
    → npm ci
    → npm test (full suite — --lastCommit removed)
    → all 22 suites run, regressions detected
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Remove `--lastCommit` from `test`; add `test:local` and `test:ci` scripts; add `lint-staged` to devDeps; add `lint-staged` config block |
| `.husky/pre-commit` | Modify | Replace `npm test` with `npx lint-staged` |
| `.husky/pre-push` | No change | Already runs `npm run test` — now correct after `test` fix |
| `.github/workflows/ci.yml` | No change | Already uses `npm test` — now correct after `test` fix |
| `biome.json` | No change | Existing config is referenced by lint-staged |

## Interfaces / Contracts

### package.json scripts (final state)

```json
"scripts": {
  "test": "jest --forceExit --maxWorkers=50% --detectOpenHandles --collectCoverage=false",
  "test:local": "jest --forceExit --maxWorkers=50% --detectOpenHandles --collectCoverage=false --lastCommit",
  "test:ci": "jest --forceExit --maxWorkers=50% --detectOpenHandles --collectCoverage=false",
  "test:cov": "jest --detectOpenHandles --coverage --forceExit",
  "test:e2e": "jest --detectOpenHandles --config ./test/jest-e2e.json --forceExit --collectCoverage=false"
}
```

### lint-staged config (in package.json)

```json
"lint-staged": {
  "*.{ts,js,json}": "npx biome check --write --no-errors-on-unmatched"
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Validation | `npm test` runs full suite | Run `npm test` and verify all 22 suites execute (not 4) |
| Validation | `npm run test:local` runs last commit only | Make a trivial change, run `test:local`, verify subset |
| Validation | Pre-commit hook triggers lint-staged | Stage a file with formatting issues, commit, verify Biome fixes it |
| Validation | Pre-commit blocks on lint errors | Stage a file with unfixable lint error, verify commit is blocked |
| Validation | Pre-push runs full suite | `git push` triggers full test suite execution |
| Integration | CI workflow runs full suite | Push to branch, verify CI `test` job runs all 22 suites |

## Migration / Rollout

No data migration required. Tooling-only change.

**Rollout steps**:
1. Apply changes locally
2. Verify `npm test` runs all suites (not just last commit)
3. Verify `npm run test:local` runs subset
4. Verify pre-commit triggers lint-staged on a test commit
5. Verify pre-push triggers full suite on a test push
6. Push branch, verify CI runs full suite in GitHub Actions

**Rollback**: Revert `package.json` scripts and `.husky/pre-commit`. Remove `lint-staged` from devDependencies.

## Open Questions

None — all decisions are straightforward with clear tradeoffs.
