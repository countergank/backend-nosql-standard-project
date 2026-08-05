import { ParameterEntry } from '../parameter.types';

/** Admin-facing representation of a runtime parameter. */
export class ParameterEntryDto {
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean';
  default: string | number | boolean;
  group: string;
  ttl: number;
  isOverridden: boolean;
  description?: string;

  constructor(entry: ParameterEntry) {
    this.key = entry.key;
    this.value = entry.value;
    this.type = entry.type;
    this.default = entry.default;
    this.group = entry.group;
    this.ttl = entry.ttl;
    this.isOverridden = entry.isOverridden;
    this.description = entry.description;
  }

  static of(entry: ParameterEntry): ParameterEntryDto {
    return new ParameterEntryDto(entry);
  }
}
