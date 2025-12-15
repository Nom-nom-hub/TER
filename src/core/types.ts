/**
 * Type System for TER
 * Defines all supported types and their validation/coercion logic
 */

export interface TypeValidationError {
  field: string;
  value: string | undefined;
  expected: string;
  reason: string;
}

export interface TypeDefinition {
  name: string;
  defaultValue?: unknown;
  isRequired: boolean;
  validate(value: string | undefined): { valid: true; value: unknown } | { valid: false; error: TypeValidationError };
  coerce(value: string): unknown;
  isSecret: boolean;
}

/**
 * Base class for all type definitions
 */
export abstract class BaseType implements TypeDefinition {
  abstract name: string;
  abstract isSecret: boolean;
  defaultValue?: unknown;
  isRequired = false;

  abstract coerce(value: string): unknown;

  abstract validate(value: string | undefined): { valid: true; value: unknown } | { valid: false; error: TypeValidationError };

  default(value: unknown): this {
    this.defaultValue = value;
    this.isRequired = false;
    return this;
  }

  optional(): this {
    this.isRequired = false;
    return this;
  }

  markRequired(): this {
    this.isRequired = true;
    return this;
  }
}

/**
 * String type
 */
export class StringType extends BaseType {
  name = 'string';
  isSecret = false;
  private minLength?: number;
  private maxLength?: number;
  private pattern?: RegExp;

  min(length: number): this {
    this.minLength = length;
    return this;
  }

  max(length: number): this {
    this.maxLength = length;
    return this;
  }

  matches(pattern: RegExp): this {
    this.pattern = pattern;
    return this;
  }

  coerce(value: string): string {
    return value;
  }

  validate(value: string | undefined): { valid: true; value: unknown } | { valid: false; error: TypeValidationError } {
    if (value === undefined || value === '') {
      if (this.isRequired) {
        return {
          valid: false,
          error: {
            field: '',
            value,
            expected: 'string',
            reason: 'Value is required',
          },
        };
      }
      return { valid: true, value: this.defaultValue ?? '' };
    }

    if (this.minLength !== undefined && value.length < this.minLength) {
      return {
        valid: false,
        error: {
          field: '',
          value,
          expected: `string with minimum length ${this.minLength}`,
          reason: `String length ${value.length} is less than minimum ${this.minLength}`,
        },
      };
    }

    if (this.maxLength !== undefined && value.length > this.maxLength) {
      return {
        valid: false,
        error: {
          field: '',
          value,
          expected: `string with maximum length ${this.maxLength}`,
          reason: `String length ${value.length} is greater than maximum ${this.maxLength}`,
        },
      };
    }

    if (this.pattern !== undefined && !this.pattern.test(value)) {
      return {
        valid: false,
        error: {
          field: '',
          value,
          expected: `string matching pattern ${this.pattern}`,
          reason: `String does not match required pattern`,
        },
      };
    }

    return { valid: true, value };
  }
}

/**
 * Number type (float)
 */
export class NumberType extends BaseType {
  name = 'number';
  isSecret = false;
  private min?: number;
  private max?: number;

  minimum(value: number): this {
    this.min = value;
    return this;
  }

  maximum(value: number): this {
    this.max = value;
    return this;
  }

  coerce(value: string): number {
    return parseFloat(value);
  }

  validate(value: string | undefined): { valid: true; value: unknown } | { valid: false; error: TypeValidationError } {
    if (value === undefined || value === '') {
      if (this.isRequired) {
        return {
          valid: false,
          error: {
            field: '',
            value,
            expected: 'number',
            reason: 'Value is required',
          },
        };
      }
      return { valid: true, value: this.defaultValue };
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
      return {
        valid: false,
        error: {
          field: '',
          value,
          expected: 'number',
          reason: `"${value}" is not a valid number`,
        },
      };
    }

    if (this.min !== undefined && num < this.min) {
      return {
        valid: false,
        error: {
          field: '',
          value,
          expected: `number >= ${this.min}`,
          reason: `Number ${num} is less than minimum ${this.min}`,
        },
      };
    }

    if (this.max !== undefined && num > this.max) {
      return {
        valid: false,
        error: {
          field: '',
          value,
          expected: `number <= ${this.max}`,
          reason: `Number ${num} is greater than maximum ${this.max}`,
        },
      };
    }

    return { valid: true, value: num };
  }
}

/**
 * Integer type (no decimals)
 */
export class IntType extends NumberType {
  name = 'int';

  coerce(value: string): number {
    return parseInt(value, 10);
  }

  validate(value: string | undefined): { valid: true; value: unknown } | { valid: false; error: TypeValidationError } {
    if (value === undefined || value === '') {
      if (this.isRequired) {
        return {
          valid: false,
          error: {
            field: '',
            value,
            expected: 'integer',
            reason: 'Value is required',
          },
        };
      }
      return { valid: true, value: this.defaultValue };
    }

    const num = parseInt(value, 10);
    if (isNaN(num) || num.toString() !== value.trim()) {
      return {
        valid: false,
        error: {
          field: '',
          value,
          expected: 'integer',
          reason: `"${value}" is not a valid integer`,
        },
      };
    }

    return super.validate(num.toString());
  }
}

/**
 * Boolean type
 */
export class BooleanType extends BaseType {
  name = 'boolean';
  isSecret = false;

  coerce(value: string): boolean {
    const lower = value.toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(lower)) return true;
    if (['false', '0', 'no', 'off'].includes(lower)) return false;
    throw new Error(`Cannot coerce "${value}" to boolean`);
  }

  validate(value: string | undefined): { valid: true; value: unknown } | { valid: false; error: TypeValidationError } {
    if (value === undefined || value === '') {
      if (this.isRequired) {
        return {
          valid: false,
          error: {
            field: '',
            value,
            expected: 'boolean',
            reason: 'Value is required',
          },
        };
      }
      return { valid: true, value: this.defaultValue };
    }

    try {
      const coerced = this.coerce(value);
      return { valid: true, value: coerced };
    } catch {
      return {
        valid: false,
        error: {
          field: '',
          value,
          expected: 'boolean (true/false, yes/no, 1/0, on/off)',
          reason: `"${value}" is not a valid boolean`,
        },
      };
    }
  }
}

/**
 * Enum type
 */
export class EnumType<T extends readonly string[]> extends BaseType {
  name = 'enum';
  isSecret = false;

  constructor(public allowedValues: T) {
    super();
  }

  coerce(value: string): string {
    return value;
  }

  validate(value: string | undefined): { valid: true; value: unknown } | { valid: false; error: TypeValidationError } {
    if (value === undefined || value === '') {
      if (this.isRequired) {
        return {
          valid: false,
          error: {
            field: '',
            value,
            expected: `one of: ${this.allowedValues.join(', ')}`,
            reason: 'Value is required',
          },
        };
      }
      return { valid: true, value: this.defaultValue };
    }

    if (!this.allowedValues.includes(value as any)) {
      return {
        valid: false,
        error: {
          field: '',
          value,
          expected: `one of: ${this.allowedValues.join(', ')}`,
          reason: `"${value}" is not a valid option`,
        },
      };
    }

    return { valid: true, value };
  }
}

/**
 * URL type
 */
export class URLType extends BaseType {
  name = 'url';
  isSecret = false;

  coerce(value: string): string {
    return value;
  }

  validate(value: string | undefined): { valid: true; value: unknown } | { valid: false; error: TypeValidationError } {
    if (value === undefined || value === '') {
      if (this.isRequired) {
        return {
          valid: false,
          error: {
            field: '',
            value,
            expected: 'valid URL',
            reason: 'Value is required',
          },
        };
      }
      return { valid: true, value: this.defaultValue };
    }

    try {
      new URL(value);
      return { valid: true, value };
    } catch {
      return {
        valid: false,
        error: {
          field: '',
          value,
          expected: 'valid URL',
          reason: `"${value}" is not a valid URL`,
        },
      };
    }
  }
}

/**
 * JSON type
 */
export class JSONType extends BaseType {
  name = 'json';
  isSecret = false;

  coerce(value: string): unknown {
    return JSON.parse(value);
  }

  validate(value: string | undefined): { valid: true; value: unknown } | { valid: false; error: TypeValidationError } {
    if (value === undefined || value === '') {
      if (this.isRequired) {
        return {
          valid: false,
          error: {
            field: '',
            value,
            expected: 'valid JSON',
            reason: 'Value is required',
          },
        };
      }
      return { valid: true, value: this.defaultValue };
    }

    try {
      const parsed = JSON.parse(value);
      return { valid: true, value: parsed };
    } catch (err) {
      return {
        valid: false,
        error: {
          field: '',
          value,
          expected: 'valid JSON',
          reason: `Invalid JSON: ${err instanceof Error ? err.message : 'unknown error'}`,
        },
      };
    }
  }
}

/**
 * Secret type - opaque, non-loggable
 */
export class SecretType extends BaseType {
  name = 'secret';
  isSecret = true;

  coerce(value: string): string {
    // Secret values are kept as strings but marked as secret internally
    return value;
  }

  validate(value: string | undefined): { valid: true; value: unknown } | { valid: false; error: TypeValidationError } {
    if (value === undefined || value === '') {
      if (this.isRequired) {
        return {
          valid: false,
          error: {
            field: '',
            value: '[redacted]',
            expected: 'secret',
            reason: 'Value is required',
          },
        };
      }
      return { valid: true, value: this.defaultValue };
    }

    return { valid: true, value };
  }
}

/**
 * Type factory functions
 */
export const Types = {
  string: () => new StringType(),
  number: () => new NumberType(),
  int: () => new IntType(),
  boolean: () => new BooleanType(),
  enum: <T extends readonly string[]>(values: T) => new EnumType(values),
  url: () => new URLType(),
  json: () => new JSONType(),
  secret: () => new SecretType(),
};
