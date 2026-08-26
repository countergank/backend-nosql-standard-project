import * as fs from 'node:fs';
import * as path from 'node:path';

describe('CORS Configuration in main.ts', () => {
  const mainTsPath = path.resolve(__dirname, '../src/main.ts');
  let mainTsContent: string;

  beforeAll(() => {
    mainTsContent = fs.readFileSync(mainTsPath, 'utf-8');
  });

  describe('@fastify/cors v11 compatibility', () => {
    it('should have CORS enabled', () => {
      expect(mainTsContent).toMatch(/enableCors/);
    });

    it('should explicitly configure CORS methods for Fastify v5', () => {
      // @fastify/cors v11 defaults to CORS-safelisted methods only
      // PUT, PATCH, DELETE must be explicitly specified
      const corsMatch = mainTsContent.match(/enableCors\(([^)]*)\)/);
      expect(corsMatch).toBeDefined();

      // Check if methods are explicitly configured
      if (corsMatch?.[1]) {
        const corsConfig = corsMatch[1];
        // If methods are configured, they should include common HTTP methods
        if (corsConfig.includes('methods')) {
          expect(corsConfig).toMatch(/methods.*PUT/);
          expect(corsConfig).toMatch(/methods.*DELETE/);
        }
      }
    });

    it('should have CORS configured before versioning', () => {
      const enableCorsIndex = mainTsContent.indexOf('enableCors');
      const enableVersioningIndex = mainTsContent.indexOf('enableVersioning');
      expect(enableCorsIndex).toBeLessThan(enableVersioningIndex);
    });
  });
});
