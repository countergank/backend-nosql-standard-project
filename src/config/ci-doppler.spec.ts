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
  });

  describe('Service Token', () => {
    it('should reference DOPPLER_SERVICE_TOKEN from GitHub secrets', () => {
      expect(ciContent).toMatch(/DOPPLER_SERVICE_TOKEN/);
    });
  });

  describe('Test Commands', () => {
    it('should wrap test commands with doppler run', () => {
      // Expect a line like: doppler run npm test
      expect(ciContent).toMatch(/doppler run npm test/);
    });
  });
});