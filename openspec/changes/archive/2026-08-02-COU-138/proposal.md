# Proposal: Actualizar CI/CD GitHub Actions

## Intent

Current CI has only 2 jobs (commitlint + test) and uses `npm test` instead of `npm test:ci`, throttling CI with `--maxWorkers=50%`. Code style (Biome lint) and build correctness are not validated in CI — bugs merge unchecked. The existing `ci-doppler.spec.ts` validates CI structure and will break if workflow changes are not synchronized.

## Scope

### In Scope (Phase 1)
- Add Biome lint job to CI workflow
- Add NestJS build verification job
- Switch test job from `npm test` to `npm run test:ci`
- Add e2e test job with MongoDB service container
- Update `ci-doppler.spec.ts` to validate new CI structure
- Upload test result artifacts

### Out of Scope
- Docker build/push (Phase 2)
- Doppler secrets integration (Phase 2)
- Deployment workflows (Phase 3)
- Coverage reporting (future)
- Matrix Node.js testing (future)
- Security scanning (future)

## Capabilities

### New Capabilities
- `ci-pipeline`: GitHub Actions workflow definition — jobs, triggers, service containers, artifact uploads

### Modified Capabilities
- `testing-scripts`: CI scenario currently assumes `npm test` — must update to reflect `npm test:ci` usage

## Approach

Extend the existing `.github/workflows/ci.yml` with 3 new jobs. Keep commitlint job unchanged. Use `mongodb-memory-server` already in dependencies for e2e (no external service needed). Use reusable step patterns for Node setup to reduce duplication.

**Job layout:**
1. `commitlint` — unchanged
2. `lint` — Biome lint (`npm run lint`)
3. `build` — NestJS build (`npm run build`)
4. `test` — switch to `npm run test:ci`
5. `e2e` — MongoDB service + `npm run test:e2e`

All jobs run in parallel (no `needs` dependencies) for fast feedback.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.github/workflows/ci.yml` | Modified | Add lint, build, e2e jobs; switch test command |
| `src/config/ci-doppler.spec.ts` | Modified | Update assertions to validate new CI structure |
| `openspec/specs/testing-scripts/spec.md` | Modified | Update CI scenario to reference `test:ci` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `ci-doppler.spec.ts` breaks on CI changes | High | Update test assertions in same PR |
| e2e tests flaky without MongoDB service | Medium | Use `mongodb-memory-server` (already a dependency) |
| Parallel jobs increase GitHub Actions minutes | Low | Acceptable for CI correctness; monitor usage |
| `npm run lint` fails on existing code | Low | Run locally first; fix before merge |

## Rollback Plan

Revert `.github/workflows/ci.yml` to previous version (2 jobs). Revert `ci-doppler.spec.ts` assertions. No data migration involved.

## Dependencies

- `@biomejs/biome` already installed (devDependency)
- `mongodb-memory-server` already installed (dependency)
- `test:ci` and `test:e2e` scripts already defined in `package.json`

## Success Criteria

- [ ] CI workflow has 5 jobs: commitlint, lint, build, test, e2e
- [ ] `npm run test:ci` executes instead of `npm test` in CI
- [ ] Biome lint job passes or blocks PRs with lint errors
- [ ] Build job catches compilation errors before merge
- [ ] e2e tests run against MongoDB memory server
- [ ] `ci-doppler.spec.ts` passes with updated assertions
- [ ] All jobs run in parallel for fast CI feedback
