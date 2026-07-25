import * as fs from 'node:fs';
import * as path from 'node:path';

describe('CI Configuration', () => {
  const ciPath = path.resolve(__dirname, '../../.github/workflows/ci.yml');
  const actionPath = path.resolve(__dirname, '../../.github/actions/setup-node/action.yml');
  let ciContent: string;
  let actionContent: string;

  beforeAll(() => {
    ciContent = fs.readFileSync(ciPath, 'utf-8');
    actionContent = fs.readFileSync(actionPath, 'utf-8');
  });

  describe('Test Execution', () => {
    it('should run npm run test:ci (not npm test)', () => {
      expect(ciContent).toMatch(/run: npm run test:ci/);
    });

    it('should not use doppler run for tests (until token is configured)', () => {
      // Doppler is optional - tests run without it until DOPPLER_SERVICE_TOKEN is configured
      expect(ciContent).not.toMatch(/doppler run npm test/);
    });
  });

  describe('PR Trigger', () => {
    it('should trigger on pull requests to main or develop', () => {
      expect(ciContent).toMatch(/branches: \[main, develop\]/);
    });
  });

  describe('Node.js Setup', () => {
    it('should use .nvmrc for Node.js version in composite action', () => {
      expect(actionContent).toMatch(/node-version-file: '\.nvmrc'/);
    });

    it('should install dependencies with npm ci in composite action', () => {
      expect(actionContent).toMatch(/run: npm ci/);
    });
  });

  describe('Commit Linting', () => {
    it('should run commitlint on PR commits', () => {
      expect(ciContent).toMatch(/npx commitlint/);
    });

    it('should fetch full history for commit linting', () => {
      expect(ciContent).toMatch(/fetch-depth: 0/);
    });
  });

  describe('Parallel Jobs', () => {
    it('should have a lint job', () => {
      expect(ciContent).toMatch(/name:.*[Ll]int/);
    });

    it('should have a build job', () => {
      expect(ciContent).toMatch(/name:.*[Bb]uild/);
    });

    it('should have an e2e job', () => {
      expect(ciContent).toMatch(/name:.*[Ee]2[Ee]/);
    });
  });

  describe('Composite Action', () => {
    it('should use setup-node composite action', () => {
      expect(ciContent).toMatch(/uses: \.\/\.github\/actions\/setup-node/);
    });
  });
});
