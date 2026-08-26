import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

describe('Project Configuration for Skills Installation', () => {
  describe('.gitignore configuration', () => {
    let gitignoreContent: string;

    beforeAll(() => {
      gitignoreContent = readFileSync(join(ROOT, '.gitignore'), 'utf-8');
    });

    it('should exclude .claude/ directory from git', () => {
      // This test verifies .claude/ is in .gitignore
      // Task 3.1: Add .claude/ to .gitignore
      const hasClaudeEntry = gitignoreContent
        .split('\n')
        .some((line) => line.trim() === '.claude/' || line.trim() === '.claude');
      expect(hasClaudeEntry).toBe(true);
    });

    it('should NOT exclude .agents/ directory from git (skills are committed)', () => {
      // Design decision: .agents/skills/ is committed for team consistency
      const hasAgentsEntry = gitignoreContent
        .split('\n')
        .some((line) => line.trim() === '.agents/' || line.trim() === '.agents');
      expect(hasAgentsEntry).toBe(false);
    });
  });

  describe('package.json configuration', () => {
    let packageJson: Record<string, unknown>;

    beforeAll(() => {
      const content = readFileSync(join(ROOT, 'package.json'), 'utf-8');
      packageJson = JSON.parse(content);
    });

    it('should have install:skills script', () => {
      // Task 3.3: Add install:skills script to package.json
      const scripts = packageJson.scripts as Record<string, string>;
      expect(scripts).toHaveProperty('install:skills');
    });

    it('install:skills script should run npx skills add', () => {
      const scripts = packageJson.scripts as Record<string, string>;
      expect(scripts['install:skills']).toContain('npx skills add');
    });

    it('install:skills script should install all three skills', () => {
      const scripts = packageJson.scripts as Record<string, string>;
      const script = scripts['install:skills'];
      expect(script).toContain('nestjs-backend');
      expect(script).toContain('github-conventions');
      expect(script).toContain('git-environment-flow');
    });

    it('install:skills script should use --copy flag', () => {
      const scripts = packageJson.scripts as Record<string, string>;
      expect(scripts['install:skills']).toContain('--copy');
    });

    it('install:skills script should use -y flag', () => {
      const scripts = packageJson.scripts as Record<string, string>;
      expect(scripts['install:skills']).toContain('-y');
    });
  });

  describe('test scripts configuration', () => {
    let packageJson: Record<string, unknown>;

    beforeAll(() => {
      const content = readFileSync(join(ROOT, 'package.json'), 'utf-8');
      packageJson = JSON.parse(content);
    });

    it('should have test script without --lastCommit flag', () => {
      const scripts = packageJson.scripts as Record<string, string>;
      expect(scripts).toHaveProperty('test');
      expect(scripts.test).not.toContain('--lastCommit');
    });

    it('test script should include other flags', () => {
      const scripts = packageJson.scripts as Record<string, string>;
      expect(scripts.test).toContain('--forceExit');
      expect(scripts.test).toContain('--maxWorkers=50%');
      expect(scripts.test).toContain('--detectOpenHandles');
      expect(scripts.test).toContain('--collectCoverage=false');
    });

    it('should have test:local script with --lastCommit', () => {
      const scripts = packageJson.scripts as Record<string, string>;
      expect(scripts).toHaveProperty('test:local');
      expect(scripts['test:local']).toContain('--lastCommit');
    });

    it('test:local script should include other flags', () => {
      const scripts = packageJson.scripts as Record<string, string>;
      expect(scripts['test:local']).toContain('--forceExit');
      expect(scripts['test:local']).toContain('--maxWorkers=50%');
      expect(scripts['test:local']).toContain('--detectOpenHandles');
      expect(scripts['test:local']).toContain('--collectCoverage=false');
    });

    it('should have test:ci script without --lastCommit', () => {
      const scripts = packageJson.scripts as Record<string, string>;
      expect(scripts).toHaveProperty('test:ci');
      expect(scripts['test:ci']).not.toContain('--lastCommit');
    });

    it('test:ci script should include other flags', () => {
      const scripts = packageJson.scripts as Record<string, string>;
      expect(scripts['test:ci']).toContain('--forceExit');
      expect(scripts['test:ci']).toContain('--detectOpenHandles');
      expect(scripts['test:ci']).toContain('--collectCoverage=false');
    });

    it('test:ci script should NOT include --maxWorkers', () => {
      const scripts = packageJson.scripts as Record<string, string>;
      expect(scripts['test:ci']).not.toContain('--maxWorkers');
    });
  });

  describe('lint-staged configuration', () => {
    let packageJson: Record<string, unknown>;

    beforeAll(() => {
      const content = readFileSync(join(ROOT, 'package.json'), 'utf-8');
      packageJson = JSON.parse(content);
    });

    it('should have lint-staged key', () => {
      expect(packageJson).toHaveProperty('lint-staged');
    });

    it('lint-staged should configure Biome for ts, js, json files', () => {
      const lintStaged = packageJson['lint-staged'] as Record<string, string[]>;
      expect(lintStaged).toHaveProperty(['*.{ts,js,json}']);
      const command = lintStaged['*.{ts,js,json}'];
      expect(command).toContain('biome check --write --no-errors-on-unmatched');
    });
  });

  describe('git hooks configuration', () => {
    it('pre-commit hook should run lint-staged', () => {
      const hookPath = join(ROOT, '.husky', 'pre-commit');
      const content = readFileSync(hookPath, 'utf-8');
      expect(content.trim()).toBe('npx lint-staged');
    });

    it('pre-push hook should run npm test', () => {
      const hookPath = join(ROOT, '.husky', 'pre-push');
      const content = readFileSync(hookPath, 'utf-8');
      expect(content.trim()).toBe('npm run test');
    });

    it('commit-msg hook should run commitlint', () => {
      const hookPath = join(ROOT, '.husky', 'commit-msg');
      const content = readFileSync(hookPath, 'utf-8');
      expect(content.trim()).toContain('commitlint');
    });
  });

  describe('Skill directories exist after installation', () => {
    it('should have .agents/skills/nestjs-backend/SKILL.md', () => {
      // Task 2.2: Verify nestjs-backend skill exists
      const skillPath = join(ROOT, '.agents', 'skills', 'nestjs-backend', 'SKILL.md');
      expect(existsSync(skillPath)).toBe(true);
    });

    it('should have .agents/skills/github-conventions/SKILL.md', () => {
      // Task 2.3: Verify github-conventions skill exists
      const skillPath = join(ROOT, '.agents', 'skills', 'github-conventions', 'SKILL.md');
      expect(existsSync(skillPath)).toBe(true);
    });

    it('should have .agents/skills/git-environment-flow/SKILL.md', () => {
      // Task 2.4: Verify git-environment-flow skill exists
      const skillPath = join(ROOT, '.agents', 'skills', 'git-environment-flow', 'SKILL.md');
      expect(existsSync(skillPath)).toBe(true);
    });

    it('should have skills-lock.json at project root', () => {
      // Task 2.5: Verify skills-lock.json exists
      const lockPath = join(ROOT, 'skills-lock.json');
      expect(existsSync(lockPath)).toBe(true);
    });
  });
});
