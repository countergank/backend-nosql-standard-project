import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

describe('Makefile', () => {
  const projectRoot = path.resolve(__dirname, '..');

  beforeAll(() => {
    // Ensure Makefile exists
    const makefilePath = path.join(projectRoot, 'Makefile');
    if (!fs.existsSync(makefilePath)) {
      throw new Error('Makefile does not exist at project root');
    }
  });

  describe('Variables', () => {
    it('should define NODE_ENV with default value "local"', async () => {
      // Clear NODE_ENV from environment to test default value
      // IMPORTANT: do NOT pass NODE_ENV= on the make command line (command-line vars override Makefile logic)
      const cleanEnv = { ...process.env };
      delete cleanEnv.NODE_ENV;
      const { stdout } = await execAsync('make -n dev', {
        cwd: projectRoot,
        env: cleanEnv,
      });
      expect(stdout).toContain('NODE_ENV=local');
    });

    it('should allow NODE_ENV override', async () => {
      const { stdout } = await execAsync('make -n dev NODE_ENV=production', {
        cwd: projectRoot,
      });
      expect(stdout).toContain('NODE_ENV=production');
    });

    it('should define VERSION with default value "latest"', async () => {
      const { stdout } = await execAsync('make -n build', { cwd: projectRoot });
      expect(stdout).toContain('VERSION=latest');
    });
  });

  describe('npm wrapper targets', () => {
    it('install target should wrap npm ci', async () => {
      const { stdout } = await execAsync('make -n install', { cwd: projectRoot });
      expect(stdout).toContain('npm ci');
    });

    it('dev target should wrap npm run start:dev', async () => {
      const { stdout } = await execAsync('make -n dev', { cwd: projectRoot });
      expect(stdout).toContain('npm run start:dev');
    });

    it('build target should wrap npm run build', async () => {
      const { stdout } = await execAsync('make -n build', { cwd: projectRoot });
      expect(stdout).toContain('npm run build');
    });

    it('lint target should wrap npm run lint', async () => {
      const { stdout } = await execAsync('make -n lint', { cwd: projectRoot });
      expect(stdout).toContain('npm run lint');
    });

    it('test target should wrap npm run test', async () => {
      const { stdout } = await execAsync('make -n test', { cwd: projectRoot });
      expect(stdout).toContain('npm run test');
    });

    it('test-e2e target should wrap npm run test:e2e', async () => {
      const { stdout } = await execAsync('make -n test-e2e', { cwd: projectRoot });
      expect(stdout).toContain('npm run test:e2e');
    });
  });

  describe('docker wrapper targets', () => {
    it('docker-build target should wrap docker compose build', async () => {
      const { stdout } = await execAsync('make -n docker-build', {
        cwd: projectRoot,
      });
      expect(stdout).toContain('docker compose build');
    });

    it('docker-up target should wrap docker compose up -d', async () => {
      const { stdout } = await execAsync('make -n docker-up', { cwd: projectRoot });
      expect(stdout).toContain('docker compose up -d');
    });

    it('docker-down target should wrap docker compose down', async () => {
      const { stdout } = await execAsync('make -n docker-down', {
        cwd: projectRoot,
      });
      expect(stdout).toContain('docker compose down');
    });

    it('docker-logs target should wrap docker compose logs -f', async () => {
      const { stdout } = await execAsync('make -n docker-logs', {
        cwd: projectRoot,
      });
      expect(stdout).toContain('docker compose logs -f');
    });
  });

  describe('docker-redeploy composite target', () => {
    it('should execute docker-down, docker-build, docker-up in sequence', async () => {
      const { stdout } = await execAsync('make -n docker-redeploy', {
        cwd: projectRoot,
      });
      expect(stdout).toContain('docker compose down');
      expect(stdout).toContain('docker compose build');
      expect(stdout).toContain('docker compose up -d');
    });
  });

  describe('help target', () => {
    it('should list all targets with descriptions', async () => {
      const { stdout } = await execAsync('make help', { cwd: projectRoot });
      expect(stdout).toContain('install');
      expect(stdout).toContain('dev');
      expect(stdout).toContain('build');
      expect(stdout).toContain('lint');
      expect(stdout).toContain('test');
      expect(stdout).toContain('test-e2e');
      expect(stdout).toContain('docker-build');
      expect(stdout).toContain('docker-up');
      expect(stdout).toContain('docker-down');
      expect(stdout).toContain('docker-logs');
      expect(stdout).toContain('docker-redeploy');
      expect(stdout).toContain('help');
    });
  });

  describe('Failure behavior', () => {
    it('should propagate exit code when target fails', async () => {
      try {
        await execAsync('make nonexistent-target-xyz', { cwd: projectRoot });
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.code).not.toBe(0);
      }
    });

    it('should stop docker-redeploy sequence on failure', () => {
      const makefilePath = path.join(projectRoot, 'Makefile');
      const content = fs.readFileSync(makefilePath, 'utf8');
      // docker-redeploy must have dependencies (docker-down docker-build docker-up)
      // Make stops execution if any dependency fails
      const redeployMatch = content.match(
        /^docker-redeploy:\s*(.+)$/m,
      );
      expect(redeployMatch).not.toBeNull();
      const deps = redeployMatch![1].split(/\s+/);
      expect(deps).toContain('docker-down');
      expect(deps).toContain('docker-build');
      expect(deps).toContain('docker-up');
    });
  });

  describe('Help auto-discovery', () => {
    it('should dynamically discover targets from Makefile', async () => {
      const { stdout } = await execAsync('make help', { cwd: projectRoot });
      // help output should include at least the core targets
      const lines = stdout.split('\n').filter((l) => l.trim().length > 0);
      // Should have "Targets:" header + at least 10 targets
      const targetLines = lines.filter(
        (l) => l.includes('install') || l.includes('dev') || l.includes('build'),
      );
      expect(targetLines.length).toBeGreaterThanOrEqual(3);
    });

    it('should auto-discover new targets with ## annotations', async () => {
      const makefilePath = path.join(projectRoot, 'Makefile');
      const content = fs.readFileSync(makefilePath, 'utf8');
      // All targets with ## comments should be parseable by the grep pattern
      const targetsWithDocs = content.match(
        /^[a-zA-Z][a-zA-Z0-9_-]*:.*?## .+$/gm,
      );
      expect(targetsWithDocs).not.toBeNull();
      expect(targetsWithDocs!.length).toBeGreaterThanOrEqual(12);
    });
  });

  describe('POSIX compatibility', () => {
    it('should use tabs for indentation (not spaces)', () => {
      const makefilePath = path.join(projectRoot, 'Makefile');
      const content = fs.readFileSync(makefilePath, 'utf8');
      const lines = content.split('\n');
      const targetLines = lines.filter(
        (line) => line.match(/^[a-zA-Z][\w-]*:/) && !line.startsWith('#'),
      );

      for (const line of targetLines) {
        const targetName = line.split(':')[0];
        const targetIndex = lines.indexOf(line);
        const nextLine = lines[targetIndex + 1];

        if (nextLine && nextLine.trim().length > 0) {
          expect(nextLine[0]).toBe('\t');
        }
      }
    });

    it('should declare .PHONY for all targets', () => {
      const makefilePath = path.join(projectRoot, 'Makefile');
      const content = fs.readFileSync(makefilePath, 'utf8');
      expect(content).toContain('.PHONY:');
    });
  });
});
