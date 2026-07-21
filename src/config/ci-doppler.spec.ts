import * as fs from 'fs';
import * as path from 'path';

describe('CI Configuration', () => {
  const ciPath = path.resolve(__dirname, '../../.github/workflows/ci.yml');
  let ciContent: string;

  beforeAll(() => {
    ciContent = fs.readFileSync(ciPath, 'utf-8');
  });

  describe('Test Execution', () => {
    it('should run npm test directly', () => {
      expect(ciContent).toMatch(/run: npm test/);
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
    it('should use .nvmrc for Node.js version', () => {
      expect(ciContent).toMatch(/node-version-file: '\.nvmrc'/);
    });

    it('should install dependencies with npm ci', () => {
      expect(ciContent).toMatch(/run: npm ci/);
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
});
