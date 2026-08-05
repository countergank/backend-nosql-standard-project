export type ParameterType = 'string' | 'number' | 'boolean';

export interface ParameterDefinition<T = string | number | boolean> {
  key: string;
  type: ParameterType;
  default: T;
  group: string;
  ttl: number; // milliseconds (ms)
  description?: string;
  validate?: (value: T) => boolean;
}

export interface ParameterEntry {
  key: string;
  type: ParameterType;
  value: string | number | boolean;
  default: string | number | boolean;
  group: string;
  ttl: number; // milliseconds (ms)
  isOverridden: boolean;
  description?: string;
}

export interface ParameterDecoratorOptions {
  /** Throw when the parameter is not registered (defaults to returning undefined). */
  strict?: boolean;
}
