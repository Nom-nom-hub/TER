// Validation hooks for custom type validators

import { BaseType } from './types';

export type AsyncValidator = (value: unknown) => Promise<void>;
export type SyncValidator = (value: unknown) => void;

export interface ValidatorChain {
  validators: (AsyncValidator | SyncValidator)[];
  addValidator(validator: AsyncValidator | SyncValidator): ValidatorChain;
  validate(value: unknown, isAsync?: boolean): Promise<void>;
  validateSync(value: unknown): void;
}

export class TypeValidator implements ValidatorChain {
  validators: (AsyncValidator | SyncValidator)[] = [];

  addValidator(validator: AsyncValidator | SyncValidator): TypeValidator {
    this.validators.push(validator);
    return this;
  }

  async validate(value: unknown): Promise<void> {
    for (const validator of this.validators) {
      await this.executeValidator(validator, value);
    }
  }

  validateSync(value: unknown): void {
    for (const validator of this.validators) {
      if (this.isAsync(validator)) {
        throw new Error('Cannot run async validator in sync context');
      }
      (validator as SyncValidator)(value);
    }
  }

  private async executeValidator(
    validator: AsyncValidator | SyncValidator,
    value: unknown
  ): Promise<void> {
    if (this.isAsync(validator)) {
      return (validator as AsyncValidator)(value);
    }
    (validator as SyncValidator)(value);
  }

  private isAsync(fn: AsyncValidator | SyncValidator): boolean {
    return fn.constructor.name === 'AsyncFunction';
  }
}

// Common validators
export class Validators {
  /**
   * Email format validator
   */
  static email(): SyncValidator {
    return (value: unknown) => {
      const str = String(value);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(str)) {
        throw new Error('Invalid email format');
      }
    };
  }

  /**
   * URL validator
   */
  static urlFormat(): SyncValidator {
    return (value: unknown) => {
      try {
        new URL(String(value));
      } catch {
        throw new Error('Invalid URL format');
      }
    };
  }

  /**
   * Min length validator
   */
  static minLength(min: number): SyncValidator {
    return (value: unknown) => {
      const str = String(value);
      if (str.length < min) {
        throw new Error(`Minimum length is ${min}`);
      }
    };
  }

  /**
   * Max length validator
   */
  static maxLength(max: number): SyncValidator {
    return (value: unknown) => {
      const str = String(value);
      if (str.length > max) {
        throw new Error(`Maximum length is ${max}`);
      }
    };
  }

  /**
   * Pattern validator
   */
  static pattern(regex: RegExp): SyncValidator {
    return (value: unknown) => {
      const str = String(value);
      if (!regex.test(str)) {
        throw new Error(`Value does not match pattern ${regex.source}`);
      }
    };
  }

  /**
   * Range validator for numbers
   */
  static range(min: number, max: number): SyncValidator {
    return (value: unknown) => {
      const num = Number(value);
      if (isNaN(num) || num < min || num > max) {
        throw new Error(`Value must be between ${min} and ${max}`);
      }
    };
  }

  /**
   * Custom validator with predicate
   */
  static custom(predicate: (value: unknown) => boolean, message: string): SyncValidator {
    return (value: unknown) => {
      if (!predicate(value)) {
        throw new Error(message);
      }
    };
  }

  /**
   * Database check validator
   */
  static asyncDatabase(
    checkFn: (value: unknown) => Promise<boolean>,
    message: string
  ): AsyncValidator {
    return async (value: unknown) => {
      const result = await checkFn(value);
      if (!result) {
        throw new Error(message);
      }
    };
  }

  /**
   * Custom async validator
   */
  static async(
    checkFn: (value: unknown) => Promise<boolean>,
    message: string
  ): AsyncValidator {
    return async (value: unknown) => {
      const result = await checkFn(value);
      if (!result) {
        throw new Error(message);
      }
    };
  }

  /**
   * One of validator
   */
  static oneOf(allowed: unknown[]): SyncValidator {
    return (value: unknown) => {
      if (!allowed.includes(value)) {
        throw new Error(`Value must be one of: ${allowed.join(', ')}`);
      }
    };
  }

  /**
   * Unique validator (requires context)
   */
  static unique(existingValues: Set<unknown>): SyncValidator {
    return (value: unknown) => {
      if (existingValues.has(value)) {
        throw new Error('Value must be unique');
      }
    };
  }
}

/**
 * Schema-level validator
 */
export interface SchemaValidator {
  fieldName: string;
  validator: (value: unknown) => Promise<void> | void;
}

export class SchemaValidators {
  validators: Map<string, SchemaValidator[]> = new Map();

  /**
   * Add field-level validator
   */
  addFieldValidator(fieldName: string, validator: (value: unknown) => Promise<void> | void): SchemaValidators {
    if (!this.validators.has(fieldName)) {
      this.validators.set(fieldName, []);
    }
    this.validators.get(fieldName)!.push({
      fieldName,
      validator,
    });
    return this;
  }

  /**
   * Add cross-field validator
   */
  addCrossFieldValidator(
    validator: (values: Record<string, unknown>) => Promise<void> | void
  ): SchemaValidators {
    if (!this.validators.has('__cross__')) {
      this.validators.set('__cross__', []);
    }
    this.validators.get('__cross__')!.push({
      fieldName: '__cross__',
      validator: (values: unknown) => validator(values as Record<string, unknown>),
    });
    return this;
  }

  /**
   * Validate all fields
   */
  async validateAll(values: Record<string, unknown>): Promise<Map<string, Error[]>> {
    const errors = new Map<string, Error[]>();

    // Field validators
    for (const [fieldName, validators] of this.validators.entries()) {
      if (fieldName === '__cross__') continue;

      const value = values[fieldName];
      const fieldErrors: Error[] = [];

      for (const v of validators) {
        try {
          await Promise.resolve(v.validator(value));
        } catch (error) {
          if (error instanceof Error) {
            fieldErrors.push(error);
          }
        }
      }

      if (fieldErrors.length > 0) {
        errors.set(fieldName, fieldErrors);
      }
    }

    // Cross-field validators
    if (this.validators.has('__cross__')) {
      const crossValidators = this.validators.get('__cross__')!;
      for (const v of crossValidators) {
        try {
          await Promise.resolve(v.validator(values));
        } catch (error) {
          if (error instanceof Error) {
            if (!errors.has('__cross__')) {
              errors.set('__cross__', []);
            }
            errors.get('__cross__')!.push(error);
          }
        }
      }
    }

    return errors;
  }
}
