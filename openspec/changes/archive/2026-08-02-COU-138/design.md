# Design: Actualizar CI/CD GitHub Actions

## Technical Approach

Extend `.github/workflows/ci.yml` from 2 jobs to 5 parallel jobs. Keep the existing PR trigger on `main`/`develop`. No new external services — `mongodb-memory-server` handles e2e DB. Apply reusable YAML anchors (`node-setup` composite action) to eliminate step duplication across jobs.

## Architecture Decisions

### Decision: Parallel Jobs (no `needs` dependencies)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Parallel all jobs | Maximize feedback speed; any failure is independent | ✅ Chosen |
| Sequential (lint → build → test → e2e) | Catch lint errors before wasting build minutes | Rejected — feedback too slow, jobs are independent |
| DAG with partial deps (build → e2e) | e2e needs working build; saves minutes on lint failures | Deferred — `test:e2e` compiles on its own via ts-jest; revisit in Phase 2 |

**Rationale**: Each job validates a different concern. Failures don't block each other. GitHub Actions parallelism is free — the latency improvement justifies the slight minute increase.

### Decision: `mongodb-memory-server` over External MongoDB Service

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `mongodb-memory-server` (in-process) | No Docker overhead; already a dependency; works with `test:e2e` config | ✅ Chosen |
| MongoDB service container | Matches production; adds `services:` config; slower startup | Deferred to Phase 2 when e2e tests grow |

**Rationale**: The sole e2e test (`app.e2e-spec.ts`) bootstraps `AppModule` which imports Mongoose. `mongodb-memory-server` provides an in-memory replica set — zero config, zero external dependency.

### Decision: Reusable Node Setup via Composite Action

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Duplicate setup steps per job | Simple; ~6 lines repeated 4x | Rejected — violates DRY, maintenance burden |
| Composite action `.github/actions/setup-node/action.yml` | Single source of truth; slightly more complex; reusable | ✅ Chosen |

**Rationale**: 4 jobs share the same checkout → setup-node → cache → npm ci sequence. A composite action reduces the workflow from ~120 lines to ~70 + 15 (action).

### Decision: Update `ci-doppler.spec.ts` in Same PR

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Update test + workflow in same PR | Atomic; CI stays green after merge | ✅ Chosen |
| Separate PR for test update | Smaller diffs; risk of broken CI between merges | Rejected — not worth the risk |

**Rationale**: The test asserts `run: npm test` — changing the workflow to `npm run test:ci` breaks it. Single PR ensures CI remains self-validating.

## Data Flow

    PR opened/updated (main, develop)
           │
           ├─→ commitlint ──→ ✓ / ✗
           │
           ├─→ lint ────────→ ✓ / ✗        (biome lint ./src)
           │
           ├─→ build ───────→ ✓ / ✗        (nest build)
           │
           ├─→ test ────────→ ✓ / ✗        (jest test:ci)
           │
           └─→ e2e ─────────→ ✓ / ✗        (jest test:e2e + mongodb-memory-server)
                                    │
                                    └─ artifacts: test results

All 5 jobs run in parallel. No job depends on another. Each reports success/failure independently on the PR checks.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/ci.yml` | Modify | Expand from 2 to 5 jobs: add `lint`, `build`, `e2e`; update `test` command to `npm run test:ci` |
| `.github/actions/setup-node/action.yml` | Create | Composite action: checkout → setup-node → npm cache → npm ci |
| `src/config/ci-doppler.spec.ts` | Modify | Change assertion from `npm test` to `npm run test:ci`; add assertions for new jobs (lint, build, e2e) |

## Interfaces / Contracts

### Composite Action: `setup-node`

```yaml
# .github/actions/setup-node/action.yml
name: 'Setup Node.js'
description: 'Checkout, setup Node from .nvmrc, cache npm, install deps'
inputs:
  fetch-depth:
    description: 'Git fetch depth (0 for full history)'
    default: '1'
runs:
  using: 'composite'
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: ${{ inputs.fetch-depth }}
    - uses: actions/setup-node@v4
      with:
        node-version-file: '.nvmrc'
    - uses: actions/cache@v4
      with:
        path: ~/.npm
        key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
        restore-keys: ${{ runner.os }}-node-
    - run: npm ci
      shell: bash
```

### Job Definitions (workflow excerpt)

```yaml
lint:
  name: Biome Lint
  runs-on: ubuntu-latest
  steps:
    - uses: ./.github/actions/setup-node
    - run: npm run lint

build:
  name: Build
  runs-on: ubuntu-latest
  steps:
    - uses: ./.github/actions/setup-node
    - run: npm run build

test:
  name: Unit Tests
  runs-on: ubuntu-latest
  steps:
    - uses: ./.github/actions/setup-node
    - run: npm run test:ci

e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  steps:
    - uses: ./.github/actions/setup-node
    - run: npm run test:e2e
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: e2e-results
        path: test-results/
```

### Updated Test Assertions

```typescript
// ci-doppler.spec.ts — key changes
it('should run npm run test:ci (not npm test)', () => {
  expect(ciContent).toMatch(/run: npm run test:ci/);
});
it('should have a lint job', () => {
  expect(ciContent).toMatch(/name:.*[Ll]int/);
});
it('should have a build job', () => {
  expect(ciContent).toMatch(/name:.*[Bb]uild/);
});
it('should have an e2e job', () => {
  expect(ciContent).toMatch(/name:.*[Ee]2[Ee]/);
});
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | CI config structure | Update `ci-doppler.spec.ts` assertions for 5 jobs + `test:ci` command |
| Integration | E2E tests boot with MongoDB | `test:e2e` already uses `mongodb-memory-server` via `AppModule` — verify locally |
| E2E | Full workflow validity | Push to a PR branch, verify all 5 jobs pass on GitHub Actions |

## Migration / Rollout

No migration required. This is a workflow-only change with no data impact.

Rollout steps:
1. Create feature branch from `develop`
2. Apply all file changes in one commit
3. Run `npm run lint` and `npm run test:ci` locally to verify
4. Open PR → all 5 jobs run in parallel on GitHub
5. Merge after all checks pass

## Open Questions

- [ ] Should `e2e` job upload `test-results/` as artifact? Current `test:e2e` doesn't output to that path — may need `--outputFile` flag.
- [ ] Should `lint` job use `biome check` (format + lint) instead of just `biome lint`? Proposal says lint only, but `biome check` catches formatting too.
