/**
 * Environment Value Resolver
 * Resolves configuration values from various sources and validates them
 */

import { Schema } from '../core/schema';
import { BaseType } from '../core/types';

export interface ResolveMetadata {
  source: 'process' | 'file' | 'default' | 'injected';
  resolvedAt: Date;
  sourceLocation?: string;
}

export interface ResolvedValue {
  name: string;
  value: unknown;
  metadata: ResolveMetadata;
  isSecret: boolean;
  valid: boolean;
  validationError?: string;
}

export interface ResolverOptions {
  sources?: Array<'process' | 'file' | 'injected'>;
  fileEnv?: Record<string, string>;
  injected?: Record<string, string>;
  throwOnInvalid?: boolean;
}

/**
 * Resolves environment values from multiple sources
 */
export class Resolver {
  constructor(
    private schema: Schema,
    private options: ResolverOptions = {}
  ) {}

  /**
   * Resolve all values
   */
  resolve(): { values: Record<string, unknown>; resolved: ResolvedValue[] } {
    const values: Record<string, unknown> = {};
    const resolved: ResolvedValue[] = [];

    for (const variable of this.schema.getVariables()) {
      const result = this.resolveVariable(variable.name);
      if (result) {
        values[variable.name] = result.value;
        resolved.push(result);

        if (!result.valid && this.options.throwOnInvalid) {
          throw new Error(
            `Invalid value for ${variable.name}: ${result.validationError}`
          );
        }
      }
    }

    return { values, resolved };
  }

  /**
   * Resolve a single variable
   */
  private resolveVariable(name: string): ResolvedValue | null {
    const definition = this.schema.getVariable(name);
    if (!definition) return null;

    let rawValue = this.getRawValue(name);
    const metadata: ResolveMetadata = {
      source: 'process',
      resolvedAt: new Date(),
    };

    // If not found in primary sources, check file env
    if (rawValue === undefined && this.options.fileEnv && name in this.options.fileEnv) {
      rawValue = this.options.fileEnv[name];
      metadata.source = 'file';
    }

    // If not found, check injected
    if (
      rawValue === undefined &&
      this.options.injected &&
      name in this.options.injected
    ) {
      rawValue = this.options.injected[name];
      metadata.source = 'injected';
    }

    // Validate
    const validationResult = definition.type.validate(rawValue);

    if (!validationResult.valid) {
      return {
        name,
        value: undefined,
        metadata,
        isSecret: definition.type.isSecret,
        valid: false,
        validationError: validationResult.error.reason,
      };
    }

    if (validationResult.valid && rawValue === undefined && definition.type.defaultValue !== undefined) {
      metadata.source = 'default';
    }

    return {
      name,
      value: validationResult.value,
      metadata,
      isSecret: definition.type.isSecret,
      valid: true,
    };
  }

  /**
   * Get raw value from environment sources
   */
  private getRawValue(name: string): string | undefined {
    // Check process.env by default
    if (process.env[name] !== undefined) {
      return process.env[name];
    }

    return undefined;
  }
}
