import { ParameterDefinition } from './parameter.types';

/**
 * Compile-time registry seed. Every parameter available at runtime MUST be
 * declared here so the registry, store and DI token providers stay in sync.
 */
export const PARAMETER_DEFINITIONS: ParameterDefinition[] = [
  {
    key: 'ENTITY_CACHE_TTL_MS',
    type: 'number',
    default: 30_000,
    group: 'cache',
    ttl: 300_000, // 5 minutes — long enough for stability, short enough for runtime updates
    description: 'Cache TTL (ms) for entity queries',
    validate: (value) => typeof value === 'number' && Number.isFinite(value) && value > 0,
  },
];
