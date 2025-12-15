/**
 * Schema Definition for TER
 * Defines environment contracts with typed variables
 */

import { BaseType, TypeValidationError } from './types';

export interface VariableDefinition {
  name: string;
  type: BaseType;
  isRequired: boolean;
  defaultValue?: unknown;
  description?: string;
  policy?: {
    readonly?: boolean;
    visibility?: 'public' | 'secret' | 'internal';
  };
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: Array<{
    variable: string;
    error: TypeValidationError;
  }>;
}

/**
 * Environment Contract Schema
 */
export class Schema {
  private variables = new Map<string, VariableDefinition>();

  /**
   * Define a variable in the schema
   */
  define(name: string, type: BaseType): this {
    if (this.variables.has(name)) {
      throw new Error(`Variable "${name}" is already defined`);
    }

    this.variables.set(name, {
      name,
      type,
      isRequired: type.isRequired,
      defaultValue: type.defaultValue,
    });

    return this;
  }

  /**
   * Get a variable definition by name
   */
  getVariable(name: string): VariableDefinition | undefined {
    return this.variables.get(name);
  }

  /**
   * Get all variables
   */
  getVariables(): VariableDefinition[] {
    return Array.from(this.variables.values());
  }

  /**
   * Check if a variable is defined
   */
  hasVariable(name: string): boolean {
    return this.variables.has(name);
  }

  /**
   * Validate values against the schema
   */
  validate(values: Record<string, string | undefined>): SchemaValidationResult {
    const errors: Array<{
      variable: string;
      error: TypeValidationError;
    }> = [];

    for (const [name, definition] of this.variables) {
      const value = values[name];
      const result = definition.type.validate(value);

      if (!result.valid) {
        const error = result.error;
        error.field = name;
        errors.push({
          variable: name,
          error,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get schema as JSON for inspection
   */
  toJSON() {
    return {
      version: '1.0',
      variables: Array.from(this.variables.values()).map((v) => {
        const varJSON: any = {
          name: v.name,
          type: v.type.name,
          required: v.type.isRequired,
          defaultValue: v.defaultValue,
          description: v.description,
          isSecret: v.type.isSecret,
          policy: v.policy,
        };
        
        // Store enum values if applicable
        if (v.type.name === 'enum' && (v.type as any).allowedValues) {
          varJSON.values = (v.type as any).allowedValues;
        }
        
        return varJSON;
      }),
    };
  }
}

/**
 * Schema builder for fluent API
 */
export class SchemaBuilder {
  private schema = new Schema();

  /**
   * Define a variable with fluent API
   */
  var(name: string, type: BaseType): this {
    this.schema.define(name, type);
    return this;
  }

  /**
   * Build and return the schema
   */
  build(): Schema {
    return this.schema;
  }
}

/**
 * Helper to create a schema
 */
export function defineSchema(): SchemaBuilder {
  return new SchemaBuilder();
}

/**
 * Helper to create a schema from object
 */
export function createSchema(definitions: Record<string, BaseType>): Schema {
  const schema = new Schema();
  for (const [name, type] of Object.entries(definitions)) {
    schema.define(name, type);
  }
  return schema;
}
