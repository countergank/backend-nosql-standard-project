import * as fs from 'node:fs';
import * as path from 'node:path';

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
      const alpineLineIndex = lines.findIndex((line) => line.includes('apk add'));
      const dopplerLineIndex = lines.findIndex((line) => line.includes('doppler.com/cli/install.sh'));
      expect(alpineLineIndex).toBeGreaterThan(-1);
      expect(dopplerLineIndex).toBeGreaterThan(alpineLineIndex);
    });

    it('should be in the base stage (shared by all stages)', () => {
      const baseSection = dockerfileContent.split('DEVELOPMENT STAGE')[0];
      expect(baseSection).toContain('doppler.com/cli/install.sh');
    });

    it('should use curl with silent and follow-redirects flags', () => {
      expect(dockerfileContent).toMatch(/curl -sLf/);
    });
  });

  describe('Production CMD', () => {
    it('should use bare node command in production CMD (Doppler optional)', () => {
      const productionSection = dockerfileContent.split('PRODUCTION STAGE')[1];
      expect(productionSection).toBeDefined();
      expect(productionSection).toMatch(/CMD \["node", "dist\/main\.js"\]/);
    });

    it('should NOT require Doppler in production CMD', () => {
      const productionSection = dockerfileContent.split('PRODUCTION STAGE')[1];
      expect(productionSection).toBeDefined();
      // Doppler is optional - users can override CMD if needed
      expect(productionSection).not.toMatch(/CMD \["doppler"/);
    });
  });

  describe('Development Stage CMD', () => {
    it('should NOT use doppler run in development CMD', () => {
      const developmentSection = dockerfileContent.split('DEVELOPMENT STAGE')[1].split('BUILD STAGE')[0];
      expect(developmentSection).toBeDefined();
      // Development uses npm run start:dev directly (docker-compose handles Doppler via DOPPLER_TOKEN)
      expect(developmentSection).not.toMatch(/doppler run/);
    });
  });

  describe('Docker Build without network (Doppler binary)', () => {
    it('should install Doppler CLI during build, not runtime', () => {
      // The RUN instruction with curl should be in the Dockerfile (build time)
      expect(dockerfileContent).toMatch(/RUN curl -sLf https:\/\/dl\.doppler\.com\/cli\/install\.sh \| sh/);
    });
  });
});
