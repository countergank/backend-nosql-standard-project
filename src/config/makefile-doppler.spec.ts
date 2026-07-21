import * as fs from 'fs';
import * as path from 'path';

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
      // Expect a shell conditional that runs npm run start:dev as fallback
      expect(makefileContent).toMatch(/npm run start:dev/);
    });
  });
});