import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Dockerfile Configuration', () => {
  const dockerfilePath = path.resolve(__dirname, '../../Dockerfile');
  let dockerfileContent: string;

  beforeAll(() => {
    dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
  });

  describe('Base Image', () => {
    it('should use node:20-alpine as base image', () => {
      const baseImageLine = dockerfileContent.split('\n').find((line) => line.includes('FROM node:'));
      expect(baseImageLine).toBeDefined();
      expect(baseImageLine).toMatch(/FROM node:20-alpine/);
    });

    it('should not use node:18-alpine', () => {
      expect(dockerfileContent).not.toMatch(/FROM node:18-alpine/);
    });
  });

  describe('Production Stage', () => {
    it('should use node:20-alpine in production stage', () => {
      const productionSection = dockerfileContent.split('PRODUCTION STAGE')[1];
      expect(productionSection).toBeDefined();
      expect(productionSection).toMatch(/FROM node:20-alpine/);
    });
  });
});
