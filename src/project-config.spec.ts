import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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
      const hasClaudeEntry = gitignoreContent.split('\n').some(
        (line) => line.trim() === '.claude/' || line.trim() === '.claude'
      );
      expect(hasClaudeEntry).toBe(true);
    });

    it('should NOT exclude .agents/ directory from git (skills are committed)', () => {
      // Design decision: .agents/skills/ is committed for team consistency
      const hasAgentsEntry = gitignoreContent.split('\n').some(
        (line) => line.trim() === '.agents/' || line.trim() === '.agents'
      );
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
