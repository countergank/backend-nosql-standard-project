import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Docker Build Configuration', () => {
  const dockerfilePath = path.resolve(__dirname, '../../Dockerfile');
  let dockerfileContent: string;

  beforeAll(() => {
    dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
  });

  describe('Build stages', () => {
    it('should have a development stage', () => {
      expect(dockerfileContent).toMatch(/FROM.*AS development/);
    });

    it('should have a build stage', () => {
      expect(dockerfileContent).toMatch(/FROM.*AS build/);
    });

    it('should have a production stage', () => {
      expect(dockerfileContent).toMatch(/FROM.*AS production/);
    });
  });

  describe('Node.js version', () => {
    it('should use Node.js 20 or later', () => {
      const nodeVersionMatches = dockerfileContent.match(/FROM node:(\d+)/g);
      expect(nodeVersionMatches).toBeDefined();

      nodeVersionMatches?.forEach((match) => {
        const version = Number.parseInt(match.match(/node:(\d+)/)?.[1] || '0');
        expect(version).toBeGreaterThanOrEqual(20);
      });
    });
  });

  describe('Health check', () => {
    it('should have a health check configured', () => {
      expect(dockerfileContent).toMatch(/HEALTHCHECK/);
    });

    it('should check the health endpoint', () => {
      expect(dockerfileContent).toMatch(/health/);
    });
  });

  describe('Build commands', () => {
    it('should run npm ci for production dependencies', () => {
      expect(dockerfileContent).toMatch(/npm ci --omit=dev/);
    });

    it('should run npm run build', () => {
      expect(dockerfileContent).toMatch(/npm run build/);
    });
  });
});
