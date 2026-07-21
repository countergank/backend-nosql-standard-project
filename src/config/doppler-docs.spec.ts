import * as fs from 'fs';
import * as path from 'path';

describe('Doppler Documentation', () => {
  const readmePath = path.resolve(__dirname, '../../README.md');
  const envExamplePath = path.resolve(__dirname, '../../.env.example');
  let readmeContent: string;
  let envExampleContent: string;

  beforeAll(() => {
    readmeContent = fs.readFileSync(readmePath, 'utf-8');
    envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');
  });

  describe('README Doppler Setup Section', () => {
    it('should have a Doppler Setup section', () => {
      expect(readmeContent).toMatch(/## Doppler Setup/);
    });

    it('should document account creation prerequisite', () => {
      expect(readmeContent).toMatch(/doppler\.com/);
    });

    it('should document doppler login command', () => {
      expect(readmeContent).toMatch(/doppler login/);
    });

    it('should document doppler init command', () => {
      expect(readmeContent).toMatch(/doppler init/);
    });

    it('should document token/secret configuration', () => {
      expect(readmeContent).toMatch(/doppler secrets set/);
    });

    it('should document local verification step', () => {
      expect(readmeContent).toMatch(/doppler run/);
    });

    it('should mention DATABASE_PASSWORD as a Doppler-managed secret', () => {
      expect(readmeContent).toMatch(/DATABASE_PASSWORD/);
    });

    it('should mention ENCRYPTION_PASSWORD as a Doppler-managed secret', () => {
      expect(readmeContent).toMatch(/ENCRYPTION_PASSWORD/);
    });
  });

  describe('README Migration Section', () => {
    it('should have a migration section', () => {
      expect(readmeContent).toMatch(/Migración/);
    });

    it('should document importing secrets from .env', () => {
      expect(readmeContent).toMatch(/doppler secrets set/);
    });
  });

  describe('.env.example Doppler Comment', () => {
    it('should mention Doppler in a comment', () => {
      expect(envExampleContent).toMatch(/Doppler/i);
    });

    it('should explain that sensitive secrets should use Doppler', () => {
      expect(envExampleContent).toMatch(/DATABASE_PASSWORD/);
    });

    it('should reference README for setup instructions', () => {
      expect(envExampleContent).toMatch(/README/);
    });
  });
});
