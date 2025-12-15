/**
 * Schema JSON Serialization
 * Utilities for converting TER schema to/from JSON format
 */

import { Schema } from './schema';
import * as Types from './types';

export interface SerializedVariableDefinition {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
  description?: string;
  isSecret?: boolean;
  values?: string[]; // For enum types
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  policy?: {
    readonly?: boolean;
    visibility?: 'public' | 'secret' | 'internal';
  };
}

export interface SerializedSchema {
  version: string;
  variables: SerializedVariableDefinition[];
}

/**
 * Reconstruct a Schema from JSON contract format
 */
export function reconstructSchemaFromJSON(json: any): Schema {
  const schema = new Schema();

  if (!json.variables || !Array.isArray(json.variables)) {
    throw new Error('Invalid contract format: missing variables array');
  }

  for (const varDef of json.variables) {
    const type = typeFromJSON(varDef);
    schema.define(varDef.name, type);
  }

  return schema;
}

/**
 * Reconstruct a BaseType from JSON variable definition
 */
function typeFromJSON(varDef: SerializedVariableDefinition): Types.BaseType {
  let type: Types.BaseType;

  switch (varDef.type) {
    case 'string':
      type = new Types.StringType();
      if (varDef.minLength !== undefined) {
        (type as Types.StringType).min(varDef.minLength);
      }
      if (varDef.maxLength !== undefined) {
        (type as Types.StringType).max(varDef.maxLength);
      }
      if (varDef.pattern !== undefined) {
        (type as Types.StringType).matches(new RegExp(varDef.pattern));
      }
      break;

    case 'int':
      type = new Types.IntType();
      if (varDef.minimum !== undefined) {
        (type as Types.IntType).minimum(varDef.minimum);
      }
      if (varDef.maximum !== undefined) {
        (type as Types.IntType).maximum(varDef.maximum);
      }
      break;

    case 'number':
      type = new Types.NumberType();
      if (varDef.minimum !== undefined) {
        (type as Types.NumberType).minimum(varDef.minimum);
      }
      if (varDef.maximum !== undefined) {
        (type as Types.NumberType).maximum(varDef.maximum);
      }
      break;

    case 'boolean':
      type = new Types.BooleanType();
      break;

    case 'enum':
      if (!varDef.values || varDef.values.length === 0) {
        throw new Error(`Enum type "${varDef.name}" has no allowed values`);
      }
      type = new Types.EnumType(varDef.values);
      break;

    case 'url':
      type = new Types.URLType();
      break;

    case 'json':
      type = new Types.JSONType();
      break;

    case 'secret':
      type = new Types.SecretType();
      break;

    default:
      throw new Error(`Unknown type: ${varDef.type}`);
  }

  // Apply modifiers
  if (varDef.defaultValue !== undefined) {
    type.default(varDef.defaultValue);
  }

  if (varDef.required) {
    type.markRequired();
  } else {
    type.optional();
  }

  return type;
}

/**
 * Export complete schema to JSON
 */
export function exportSchemaToJSON(schema: Schema): SerializedSchema {
  const variables: SerializedVariableDefinition[] = [];

  for (const varDef of schema.getVariables()) {
    const typeAny = varDef.type as any;
    const serialized: SerializedVariableDefinition = {
      name: varDef.name,
      type: varDef.type.name,
      required: varDef.type.isRequired,
      defaultValue: varDef.defaultValue,
      description: varDef.description,
      isSecret: varDef.type.isSecret,
    };

    // Type-specific properties
    switch (varDef.type.name) {
      case 'string':
        if (typeAny.minLength !== undefined) {
          serialized.minLength = typeAny.minLength;
        }
        if (typeAny.maxLength !== undefined) {
          serialized.maxLength = typeAny.maxLength;
        }
        if (typeAny.pattern !== undefined) {
          serialized.pattern = typeAny.pattern.source;
        }
        break;

      case 'int':
      case 'number':
        if (typeAny.min !== undefined) {
          serialized.minimum = typeAny.min;
        }
        if (typeAny.max !== undefined) {
          serialized.maximum = typeAny.max;
        }
        break;

      case 'enum':
        if (typeAny.allowedValues) {
          serialized.values = typeAny.allowedValues;
        }
        break;
    }

    if (varDef.policy) {
      serialized.policy = varDef.policy;
    }

    variables.push(serialized);
  }

  return {
    version: '1.0',
    variables,
  };
}
