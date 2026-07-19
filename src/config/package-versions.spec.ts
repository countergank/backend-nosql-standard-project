import * as fs from 'fs';
import * as path from 'path';

describe('Package.json NestJS Versions', () => {
  const packageJsonPath = path.resolve(__dirname, '../../package.json');
  let packageJson: Record<string, unknown>;

  beforeAll(() => {
    const content = fs.readFileSync(packageJsonPath, 'utf-8');
    packageJson = JSON.parse(content);
  });

  describe('Core NestJS packages', () => {
    it('should have @nestjs/common v11', () => {
      const version = packageJson.dependencies['@nestjs/common'];
      expect(version).toMatch(/^\^11\./);
    });

    it('should have @nestjs/core v11', () => {
      const version = packageJson.dependencies['@nestjs/core'];
      expect(version).toMatch(/^\^11\./);
    });

    it('should have @nestjs/platform-fastify v11', () => {
      const version = packageJson.dependencies['@nestjs/platform-fastify'];
      expect(version).toMatch(/^\^11\./);
    });

    it('should have @nestjs/platform-express v11', () => {
      const version = packageJson.dependencies['@nestjs/platform-express'];
      expect(version).toMatch(/^\^11\./);
    });

    it('should have @nestjs/microservices v11', () => {
      const version = packageJson.dependencies['@nestjs/microservices'];
      expect(version).toMatch(/^\^11\./);
    });
  });

  describe('NestJS ecosystem packages', () => {
    it('should have @nestjs/config v4', () => {
      const version = packageJson.dependencies['@nestjs/config'];
      expect(version).toMatch(/^\^4\./);
    });

    it('should have @nestjs/mongoose v11', () => {
      const version = packageJson.dependencies['@nestjs/mongoose'];
      expect(version).toMatch(/^\^11\./);
    });

    it('should have @nestjs/swagger v8', () => {
      const version = packageJson.dependencies['@nestjs/swagger'];
      expect(version).toMatch(/^\^8\./);
    });
  });

  describe('Dev dependencies', () => {
    it('should have @nestjs/cli v11', () => {
      const version = packageJson.devDependencies['@nestjs/cli'];
      expect(version).toMatch(/^\^11\./);
    });

    it('should have @nestjs/schematics v11', () => {
      const version = packageJson.devDependencies['@nestjs/schematics'];
      expect(version).toMatch(/^\^11\./);
    });

    it('should have @nestjs/testing v11', () => {
      const version = packageJson.devDependencies['@nestjs/testing'];
      expect(version).toMatch(/^\^11\./);
    });
  });
});
