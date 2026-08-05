# Tasks: CI/CD Pipeline Update — 5 Parallel Jobs

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 80–100 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All changes in one PR | PR 1 | Base: develop. Composite action + workflow + test update. Under 400 lines. |

## Phase 1: Composite Action (Foundation)

- [ ] 1.1 Create `.github/actions/setup-node/action.yml` — composite action: checkout → setup-node (`.nvmrc`) → npm cache → `npm ci`
- [ ] 1.2 Verify action YAML is valid: `act` or manual dry-run check

## Phase 2: CI Workflow Expansion

- [ ] 2.1 Update `.github/workflows/ci.yml` `commitlint` job to use `./.github/actions/setup-node` (replace checkout/setup-node/cache/npm ci steps)
- [ ] 2.2 Update `test` job to use composite action; change command from `npm test` to `npm run test:ci`
- [ ] 2.3 Add `lint` job: uses composite action → `npm run lint`
- [ ] 2.4 Add `build` job: uses composite action → `npm run build`
- [ ] 2.5 Add `e2e` job: uses composite action → `npm run test:e2e` + upload-artifact for `test-results/`

## Phase 3: Test Update

- [ ] 3.1 Update `src/config/ci-doppler.spec.ts` "Test Execution" describe block: change assertion from `npm test` to `npm run test:ci`
- [ ] 3.2 Add new test cases: "should have a lint job", "should have a build job", "should have an e2e job"
- [ ] 3.3 Run `npm run test:ci` locally — all assertions pass

## Phase 4: Verification

- [ ] 4.1 Run `npm run lint` — no Biome errors
- [ ] 4.2 Run `npm run build` — TypeScript compiles cleanly
- [ ] 4.3 Run `npm run test:ci` — all unit tests pass including updated CI config assertions
