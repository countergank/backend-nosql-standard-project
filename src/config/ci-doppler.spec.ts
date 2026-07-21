import * as fs from 'fs';
import * as path from 'path';

describe('CI Doppler Integration', () => {
  const ciPath = path.resolve(__dirname, '../../.github/workflows/ci.yml');
  let ciContent: string;

  beforeAll(() => {
    ciContent = fs.readFileSync(ciPath, 'utf-8');
  });

  describe('Doppler CLI Installation', () => {
    it('should install Doppler CLI via curl', () => {
      expect(ciContent).toMatch(/curl -sLf https:\/\/dl\.doppler\.com\/cli\/install\.sh \| sh/);
    });

    it('should install Doppler before running tests', () => {
      const installIndex = ciContent.indexOf('Install Doppler CLI');
      const testIndex = ciContent.indexOf('Run tests with Doppler');
      expect(installIndex).toBeGreaterThan(-1);
      expect(testIndex).toBeGreaterThan(installIndex);
    });
  });

  describe('Service Token', () => {
    it('should reference DOPPLER_SERVICE_TOKEN from GitHub secrets', () => {
      expect(ciContent).toMatch(/DOPPLER_SERVICE_TOKEN/);
    });

    it('should use secrets context for token reference', () => {
      expect(ciContent).toMatch(/\$\{\{\s*secrets\.DOPPLER_SERVICE_TOKEN\s*\}\}/);
    });

    it('should not hardcode any token values', () => {
      // Ensure no actual token strings are present (only secret references)
      expect(ciContent).not.toMatch(/DOPPLER_SERVICE_TOKEN\s*[=:]\s*["'][a-zA-Z0-9_-]{20,}/);
    });
  });

  describe('Test Commands', () => {
    it('should wrap test commands with doppler run', () => {
      expect(ciContent).toMatch(/doppler run npm test/);
    });

    it('should have DOPPLER_SERVICE_TOKEN as env var for test step', () => {
      // Check that the test step has the env var set
      const testSection = ciContent.split('Run tests with Doppler')[1];
      expect(testSection).toBeDefined();
      expect(testSection).toMatch(/DOPPLER_SERVICE_TOKEN/);
    });
  });

  describe('CI Pipeline Secrets Available', () => {
    it('should configure secrets via GitHub Actions secrets context', () => {
      // The workflow should reference secrets, not hardcoded values
      expect(ciContent).toMatch(/secrets\./);
    });

    it('should run tests with Doppler (secrets injected)', () => {
      // Verify the test command uses doppler run, meaning secrets are available at runtime
      expect(ciContent).toMatch(/doppler run npm test/);
    });
  });

  describe('PR Trigger', () => {
    it('should trigger on pull requests to main or develop', () => {
      expect(ciContent).toMatch(/branches: \[main, develop\]/);
    });
  });
});