import * as fs from 'fs';
import * as path from 'path';

describe('Docker Compose Doppler Configuration', () => {
  const dockerComposePath = path.resolve(__dirname, '../../docker-compose.yml');
  let dockerComposeContent: string;

  beforeAll(() => {
    dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf-8');
  });

  describe('API Service Environment', () => {
    it('should include DOPPLER_TOKEN in environment', () => {
      expect(dockerComposeContent).toMatch(/DOPPLER_TOKEN:\s*\$\{DOPPLER_TOKEN\}/);
    });

    it('should not have env_file directive', () => {
      const apiServiceSection = dockerComposeContent.split('api-backend-nosql-standard-project:')[1];
      expect(apiServiceSection).toBeDefined();
      expect(apiServiceSection).not.toMatch(/env_file:/);
    });
  });

  describe('Token Passed from Host', () => {
    it('should use host environment variable syntax for DOPPLER_TOKEN', () => {
      // ${DOPPLER_TOKEN} means it reads from the host shell environment
      expect(dockerComposeContent).toMatch(/\$\{DOPPLER_TOKEN\}/);
    });

    it('should not hardcode any token values', () => {
      expect(dockerComposeContent).not.toMatch(/DOPPLER_TOKEN:\s*["'][a-zA-Z0-9_-]{20,}/);
    });
  });

  describe('No Secrets in Compose File', () => {
    it('should not contain hardcoded passwords', () => {
      expect(dockerComposeContent).not.toMatch(/password.*[:=].*["'][^$]/i);
    });

    it('should not contain hardcoded encryption keys', () => {
      expect(dockerComposeContent).not.toMatch(/encryption.*[:=].*["'][^$]/i);
    });
  });
});