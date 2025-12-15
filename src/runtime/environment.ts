/**
 * Environment Runtime
 * Provides type-safe access to resolved configuration
 */

import { Schema } from '../core/schema';
import { Resolver, ResolverOptions, ResolvedValue } from './resolver';

export interface EnvironmentOptions extends ResolverOptions {}

/**
 * Type-safe environment runtime
 */
export class Environment {
  private resolver: Resolver;
  private values: Record<string, unknown> = {};
  private resolved: ResolvedValue[] = [];
  private initialized = false;

  constructor(
    private schema: Schema,
    options: EnvironmentOptions = {}
  ) {
    this.resolver = new Resolver(schema, options);
  }

  /**
   * Initialize the environment
   */
  init(): void {
    const result = this.resolver.resolve();
    this.values = result.values;
    this.resolved = result.resolved;
    this.initialized = true;
  }

  /**
   * Get a value with type assertion
   */
  get<T = unknown>(name: string): T {
    this.ensureInitialized();
    if (!(name in this.values)) {
      throw new Error(`Variable "${name}" is not defined in schema`);
    }
    return this.values[name] as T;
  }

  /**
   * Get a value safely with optional return
   */
  getOptional<T = unknown>(name: string): T | undefined {
    this.ensureInitialized();
    return (this.values[name] as T | undefined) ?? undefined;
  }

  /**
   * Get a string value
   */
  getString(name: string): string {
    return this.get<string>(name);
  }

  /**
   * Get a number value
   */
  getNumber(name: string): number {
    return this.get<number>(name);
  }

  /**
   * Get an integer value
   */
  getInt(name: string): number {
    return this.get<number>(name);
  }

  /**
   * Get a boolean value
   */
  getBoolean(name: string): boolean {
    return this.get<boolean>(name);
  }

  /**
   * Get a JSON value
   */
  getJSON(name: string): unknown {
    return this.get(name);
  }

  /**
   * Check if a variable is secret
   */
  isSecret(name: string): boolean {
    const definition = this.schema.getVariable(name);
    return definition?.type.isSecret ?? false;
  }

  /**
   * Get resolution metadata for a variable
   */
  getMetadata(name: string) {
    const resolved = this.resolved.find((r) => r.name === name);
    return resolved?.metadata;
  }

  /**
   * Get all values (for debugging/inspection)
   */
  getAllValues(hideSecrets = true): Record<string, unknown> {
    this.ensureInitialized();
    if (!hideSecrets) {
      return { ...this.values };
    }

    const safe: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this.values)) {
      if (this.isSecret(key)) {
        safe[key] = '[SECRET]';
      } else {
        safe[key] = value;
      }
    }
    return safe;
  }

  /**
   * Get all resolved values with metadata
   */
  getResolved(): ResolvedValue[] {
    this.ensureInitialized();
    return this.resolved.map((r) => ({
      ...r,
      value: this.isSecret(r.name) ? '[SECRET]' : r.value,
    }));
  }

  /**
   * Validate the environment
   */
  validate(): {
    valid: boolean;
    errors: Array<{ variable: string; error: string }>;
  } {
    this.ensureInitialized();
    const errors = this.resolved
      .filter((r) => !r.valid)
      .map((r) => ({
        variable: r.name,
        error: r.validationError || 'Unknown error',
      }));

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert to record (for use with other libraries)
   */
  toObject(): Record<string, string> {
    this.ensureInitialized();
    const obj: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.values)) {
      if (value !== null && value !== undefined) {
        obj[key] = String(value);
      }
    }
    return obj;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.init();
    }
  }
}

/**
 * Create and initialize an environment
 */
export function createEnvironment(
  schema: Schema,
  options?: EnvironmentOptions
): Environment {
  const env = new Environment(schema, options);
  env.init();
  return env;
}
