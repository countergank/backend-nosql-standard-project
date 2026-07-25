import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Docker Compose Doppler Configuration', () => {
  const dockerComposePath = path.resolve(__dirname, '../../docker-compose.yml');
  let dockerComposeContent: string;

  beforeAll(() => {
    dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf-8');
  });

  describe('API Service Environment', () => {
    it('should use npm start command', () => {
      expect(dockerComposeContent).toMatch(/npm run start:dev/);
    });

    it('should have env_file directive', () => {
      const apiServiceSection = dockerComposeContent.split('api-backend-nosql-standard-project:')[1];
      expect(apiServiceSection).toBeDefined();
      expect(apiServiceSection).toMatch(/env_file:/);
    });
  });

  describe('Doppler CLI Integration', () => {
    it('should not use doppler run command', () => {
      expect(dockerComposeContent).not.toMatch(/command:\s*doppler run/);
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
