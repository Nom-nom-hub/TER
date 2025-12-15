/**
 * JSON Schema Export
 * Convert TER schemas to JSON Schema Draft 7 for third-party tool integration
 */

import { Schema, VariableDefinition } from './schema';
import { BaseType } from './types';

/**
 * JSON Schema Draft 7 format
 */
export interface JSONSchema {
  $schema: string;
  title: string;
  description: string;
  type: 'object';
  properties: Record<string, any>;
  required: string[];
  additionalProperties: false;
}

/**
 * Convert a TER Schema to JSON Schema Draft 7
 */
export function schemaToJSONSchema(terSchema: Schema, title?: string): JSONSchema {
  const variables = terSchema.getVariables();
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const variable of variables) {
    properties[variable.name] = variableToJSONSchemaProperty(variable);

    if (variable.type.isRequired) {
      required.push(variable.name);
    }
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: title || 'Environment Configuration',
    description: 'Typed environment configuration schema',
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };
}

/**
 * Convert a variable definition to JSON Schema property
 */
function variableToJSONSchemaProperty(
  variable: VariableDefinition,
): Record<string, any> {
  const type = variable.type;
  const baseProperty: Record<string, any> = {};

  // Add description
  if (variable.description) {
    baseProperty.description = variable.description;
  } else {
    baseProperty.description = generateDescription(variable);
  }

  // Add examples if applicable
  const examples = generateExamples(variable);
  if (examples.length > 0) {
    baseProperty.examples = examples;
  }

  // Type-specific properties
  switch (type.name) {
    case 'string':
      return {
        ...baseProperty,
        type: 'string',
        ...getStringConstraints(type),
      };

    case 'int':
      return {
        ...baseProperty,
        type: 'integer',
        ...getNumberConstraints(type),
      };

    case 'number':
      return {
        ...baseProperty,
        type: 'number',
        ...getNumberConstraints(type),
      };

    case 'boolean':
      return {
        ...baseProperty,
        type: 'boolean',
      };

    case 'enum':
      return {
        ...baseProperty,
        type: 'string',
        enum: (type as any).allowedValues || [],
      };

    case 'url':
      return {
        ...baseProperty,
        type: 'string',
        format: 'uri',
      };

    case 'json':
      return {
        ...baseProperty,
        description: (baseProperty.description || '') + ' (valid JSON)',
      };

    case 'secret':
      return {
        ...baseProperty,
        type: 'string',
        description:
          (baseProperty.description || '') + ' (secret - handle with care)',
      };

    default:
      return {
        ...baseProperty,
        type: 'string',
      };
  }
}

/**
 * Extract string constraints from type
 */
function getStringConstraints(type: BaseType): Record<string, any> {
  const constraints: Record<string, any> = {};
  const typeAny = type as any;

  if (typeAny.minLength !== undefined) {
    constraints.minLength = typeAny.minLength;
  }

  if (typeAny.maxLength !== undefined) {
    constraints.maxLength = typeAny.maxLength;
  }

  if (typeAny.pattern !== undefined) {
    constraints.pattern = typeAny.pattern.source;
  }

  return constraints;
}

/**
 * Extract number constraints from type
 */
function getNumberConstraints(type: BaseType): Record<string, any> {
  const constraints: Record<string, any> = {};
  const typeAny = type as any;

  if (typeAny.min !== undefined) {
    constraints.minimum = typeAny.min;
  }

  if (typeAny.max !== undefined) {
    constraints.maximum = typeAny.max;
  }

  return constraints;
}

/**
 * Generate a description for a variable based on its type and constraints
 */
function generateDescription(variable: VariableDefinition): string {
  const type = variable.type;
  const typeAny = type as any;
  const parts: string[] = [];

  switch (type.name) {
    case 'string':
      parts.push('A string value');
      if (typeAny.minLength !== undefined || typeAny.maxLength !== undefined) {
        const lengths: string[] = [];
        if (typeAny.minLength !== undefined) {
          lengths.push(`minimum ${typeAny.minLength} characters`);
        }
        if (typeAny.maxLength !== undefined) {
          lengths.push(`maximum ${typeAny.maxLength} characters`);
        }
        parts.push(`(${lengths.join(', ')})`);
      }
      if (typeAny.pattern !== undefined) {
        parts.push(`matching pattern: ${typeAny.pattern.source}`);
      }
      break;

    case 'int':
      parts.push('An integer value');
      if (typeAny.min !== undefined || typeAny.max !== undefined) {
        const ranges: string[] = [];
        if (typeAny.min !== undefined) {
          ranges.push(`minimum ${typeAny.min}`);
        }
        if (typeAny.max !== undefined) {
          ranges.push(`maximum ${typeAny.max}`);
        }
        parts.push(`(${ranges.join(', ')})`);
      }
      break;

    case 'number':
      parts.push('A numeric value');
      if (typeAny.min !== undefined || typeAny.max !== undefined) {
        const ranges: string[] = [];
        if (typeAny.min !== undefined) {
          ranges.push(`minimum ${typeAny.min}`);
        }
        if (typeAny.max !== undefined) {
          ranges.push(`maximum ${typeAny.max}`);
        }
        parts.push(`(${ranges.join(', ')})`);
      }
      break;

    case 'boolean':
      parts.push('A boolean value (true/false)');
      break;

    case 'enum':
      parts.push('One of the allowed values');
      break;

    case 'url':
      parts.push('A valid URL (with protocol)');
      break;

    case 'json':
      parts.push('A valid JSON value');
      break;

    case 'secret':
      parts.push('A secret/sensitive value (should not be logged)');
      break;

    default:
      parts.push('A configuration value');
  }

  if (!variable.type.isRequired) {
    parts.push('(optional)');
  } else {
    parts.push('(required)');
  }

  if (variable.defaultValue !== undefined) {
    parts.push(`default: ${JSON.stringify(variable.defaultValue)}`);
  }

  return parts.join(' ');
}

/**
 * Generate example values for a variable
 */
function generateExamples(variable: VariableDefinition): string[] {
  const type = variable.type;
  const typeAny = type as any;
  const examples: string[] = [];

  switch (type.name) {
    case 'string':
      examples.push('example_value');
      break;

    case 'int':
      examples.push('3000');
      if (typeAny.min !== undefined && typeof typeAny.min === 'number') {
        examples.push(String(typeAny.min));
      }
      break;

    case 'number':
      examples.push('0.5');
      break;

    case 'boolean':
      examples.push('true');
      break;

    case 'enum':
      if (typeAny.allowedValues && typeAny.allowedValues.length > 0) {
        examples.push(typeAny.allowedValues[0]);
      }
      break;

    case 'url':
      examples.push('https://example.com');
      if (variable.name.toLowerCase().includes('database')) {
        examples.push('postgres://localhost/db');
      }
      break;

    case 'json':
      examples.push('{"key":"value"}');
      break;

    case 'secret':
      examples.push('***');
      break;
  }

  return examples;
}

/**
 * Export schema as JSON Schema string
 */
export function exportAsJSONSchema(
  terSchema: Schema,
  title?: string,
  pretty = true,
): string {
  const jsonSchema = schemaToJSONSchema(terSchema, title);
  return pretty ? JSON.stringify(jsonSchema, null, 2) : JSON.stringify(jsonSchema);
}
