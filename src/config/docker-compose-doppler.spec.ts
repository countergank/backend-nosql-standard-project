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
      // Ensure env_file is not present in the api service section
      const apiServiceSection = dockerComposeContent.split('api-backend-nosql-standard-project:')[1];
      expect(apiServiceSection).toBeDefined();
      expect(apiServiceSection).not.toMatch(/env_file:/);
    });
  });
});