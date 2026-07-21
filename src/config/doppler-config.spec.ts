import * as fs from 'fs';
import * as path from 'path';

describe('Doppler Configuration', () => {
  const dockerfilePath = path.resolve(__dirname, '../../Dockerfile');
  let dockerfileContent: string;

  beforeAll(() => {
    dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
  });

  describe('Doppler CLI Installation', () => {
    it('should install Doppler CLI in base stage via curl', () => {
      const baseSection = dockerfileContent.split('BASE IMAGE FOR ALL STAGES')[1];
      expect(baseSection).toBeDefined();
      expect(baseSection).toMatch(/curl -sLf https:\/\/dl\.doppler\.com\/cli\/install\.sh \| sh/);
    });

    it('should have Doppler CLI install after existing Alpine packages', () => {
      const lines = dockerfileContent.split('\n');
      const alpineLineIndex = lines.findIndex(line => line.includes('apk add'));
      const dopplerLineIndex = lines.findIndex(line => line.includes('doppler.com/cli/install.sh'));
      expect(alpineLineIndex).toBeGreaterThan(-1);
      expect(dopplerLineIndex).toBeGreaterThan(alpineLineIndex);
    });
  });

  describe('Production CMD', () => {
    it('should use doppler run wrapper in production CMD', () => {
      const productionSection = dockerfileContent.split('PRODUCTION STAGE')[1];
      expect(productionSection).toBeDefined();
      expect(productionSection).toMatch(/CMD \["doppler", "run", "--", "node", "dist\/main\.js"\]/);
    });
  });
});