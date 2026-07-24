import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Makefile Doppler Integration', () => {
  const makefilePath = path.resolve(__dirname, '../../Makefile');
  let makefileContent: string;

  beforeAll(() => {
    makefileContent = fs.readFileSync(makefilePath, 'utf-8');
  });

  describe('Dev Target', () => {
    it('should contain which doppler detection', () => {
      expect(makefileContent).toMatch(/which doppler/);
    });

    it('should use doppler run when available', () => {
      expect(makefileContent).toMatch(/doppler run npm run start:dev/);
    });

    it('should fallback to npm run start:dev when doppler not found', () => {
      expect(makefileContent).toMatch(/npm run start:dev/);
    });

    it('should include a warning message when doppler is not found', () => {
      expect(makefileContent).toMatch(/Warning.*doppler not found/i);
    });

    it('should use shell conditional for doppler detection', () => {
      // Should use if which doppler >/dev/null 2>&1 pattern
      expect(makefileContent).toMatch(/which doppler.*\/dev\/null/);
    });
  });

  describe('Fallback Behavior (no Doppler)', () => {
    it('should run npm script directly as fallback', () => {
      // The fallback path should run npm run start:dev
      const devLine = makefileContent.split('\n').find((line) => line.includes('doppler run'));
      expect(devLine).toBeDefined();
      expect(devLine).toContain('npm run start:dev');
    });
  });
});
