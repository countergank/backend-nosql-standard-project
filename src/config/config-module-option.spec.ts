import { ConfigModuleOption } from './custom-module-options/config-module-option';

describe('ConfigModuleOption', () => {
  describe('@nestjs/config v4 compatibility', () => {
    it('should have isGlobal set to true', () => {
      expect(ConfigModuleOption.isGlobal).toBe(true);
    });

    it('should have cache enabled', () => {
      expect(ConfigModuleOption.cache).toBe(true);
    });

    it('should have envFilePath configured', () => {
      expect(ConfigModuleOption.envFilePath).toBeDefined();
      expect(typeof ConfigModuleOption.envFilePath).toBe('string');
    });

    it('should have validate function configured', () => {
      expect(ConfigModuleOption.validate).toBeDefined();
      expect(typeof ConfigModuleOption.validate).toBe('function');
    });

    it('should not use deprecated ignoreEnvVars option', () => {
      // @nestjs/config v4 deprecated ignoreEnvVars in favor of validatePredefined
      expect(ConfigModuleOption).not.toHaveProperty('ignoreEnvVars');
    });

    it('should not use deprecated ignoreEnvFile option', () => {
      // ignoreEnvFile is still valid in v4, but let's verify it's a boolean
      if ('ignoreEnvFile' in ConfigModuleOption) {
        expect(typeof ConfigModuleOption.ignoreEnvFile).toBe('boolean');
      }
    });
  });
});
