/**
 * Diagnostics & Error Messages
 * Generate detailed, actionable error messages
 */

import { TypeValidationError } from './types';
import { VariableDefinition } from './schema';
import { Schema } from './schema';

export interface Diagnostic {
  level: 'error' | 'warning' | 'info';
  message: string;
  code: string;
  field?: string;
  suggestion?: string;
  example?: string;
}

/**
 * Generate diagnostic for a validation error
 */
export function generateDiagnostic(
  error: TypeValidationError,
  variable: VariableDefinition | undefined,
): Diagnostic {
  const { field, value, expected, reason } = error;

  // Parse the error reason to provide suggestions
  // Check for specific errors first before generic "required"
  if ((reason.includes('does not match') || reason.includes('match')) && reason.includes('pattern')) {
    return {
      level: 'error',
      code: 'INVALID_PATTERN',
      message: `${field}: "${value}" does not match the required pattern`,
      field,
      suggestion: `Value must match: ${extractPattern(expected)}`,
      example: generateExample(variable),
    };
  }

  if (reason.includes('required')) {
    return {
      level: 'error',
      code: 'MISSING_REQUIRED',
      message: `${field}: Required variable is missing`,
      field,
      suggestion: `Add ${field} to your environment file`,
      example: generateExample(variable),
    };
  }

  if (reason.includes('URL') || reason.includes('uri')) {
    return {
      level: 'error',
      code: 'INVALID_URL',
      message: `${field}: "${value}" is not a valid URL`,
      field,
      suggestion: 'URLs must include a protocol (http://, https://, postgres://, etc.)',
      example: 'https://example.com',
    };
  }

  if (reason.includes('not a valid') && expected.includes('number')) {
    return {
      level: 'error',
      code: 'INVALID_NUMBER',
      message: `${field}: "${value}" is not a valid number`,
      field,
      suggestion: 'Provide a numeric value without quotes',
      example: '3000',
    };
  }

  if (reason.includes('not a valid') && expected.includes('integer')) {
    return {
      level: 'error',
      code: 'INVALID_INTEGER',
      message: `${field}: "${value}" is not a valid integer`,
      field,
      suggestion: 'Provide a whole number without decimal points',
      example: '3000',
    };
  }

  if (reason.includes('not a valid boolean')) {
    return {
      level: 'error',
      code: 'INVALID_BOOLEAN',
      message: `${field}: "${value}" is not a valid boolean`,
      field,
      suggestion: 'Use: true, false, yes, no, on, off, 1, or 0',
      example: 'true',
    };
  }

  if (reason.includes('not one of the allowed values')) {
    return {
      level: 'error',
      code: 'INVALID_ENUM',
      message: `${field}: "${value}" is not one of the allowed values`,
      field,
      suggestion: `Allowed values: ${extractEnumValues(expected)}`,
      example: extractFirstEnumValue(expected),
    };
  }

  if (reason.includes('length') && reason.includes('greater than')) {
    return {
      level: 'error',
      code: 'STRING_TOO_LONG',
      message: `${field}: Value is too long (${(value || '').length} characters)`,
      field,
      suggestion: `Value must not exceed ${extractMaxLength(expected)} characters`,
    };
  }

  if (reason.includes('length') && reason.includes('less than')) {
    return {
      level: 'error',
      code: 'STRING_TOO_SHORT',
      message: `${field}: Value is too short (${(value || '').length} characters)`,
      field,
      suggestion: `Value must be at least ${extractMinLength(expected)} characters`,
    };
  }

  if ((reason.includes('does not match') || reason.includes('match')) && reason.includes('pattern')) {
    return {
      level: 'error',
      code: 'INVALID_PATTERN',
      message: `${field}: "${value}" does not match the required pattern`,
      field,
      suggestion: `Value must match: ${extractPattern(expected)}`,
      example: generateExample(variable),
    };
  }

  if (reason.includes('not valid') && expected.includes('JSON')) {
    return {
      level: 'error',
      code: 'INVALID_JSON',
      message: `${field}: "${value}" is not valid JSON`,
      field,
      suggestion: 'Provide valid JSON (use proper escaping in .env files)',
      example: '{"key":"value"}',
    };
  }

  if (reason.includes('greater than') && expected.includes('number')) {
    return {
      level: 'error',
      code: 'NUMBER_TOO_SMALL',
      message: `${field}: ${value} is too small`,
      field,
      suggestion: `Value must be at least ${extractMinimum(expected)}`,
    };
  }

  if (reason.includes('less than') && expected.includes('number')) {
    return {
      level: 'error',
      code: 'NUMBER_TOO_LARGE',
      message: `${field}: ${value} is too large`,
      field,
      suggestion: `Value must not exceed ${extractMaximum(expected)}`,
    };
  }

  // Generic fallback
  return {
    level: 'error',
    code: 'VALIDATION_FAILED',
    message: `${field}: Validation failed - ${reason}`,
    field,
    suggestion: `Expected: ${expected}`,
  };
}

/**
 * Find undefined variables in schema
 */
export function findUndefinedVariables(
  values: Record<string, string | undefined>,
  schema: Schema,
): string[] {
  const undefined_vars: string[] = [];

  for (const [key] of Object.entries(values)) {
    if (!schema.hasVariable(key)) {
      undefined_vars.push(key);
    }
  }

  return undefined_vars;
}

/**
 * Generate diagnostics for undefined variables
 */
export function generateUndefinedDiagnostics(
  undefined_vars: string[],
): Diagnostic[] {
  return undefined_vars.map((varName) => ({
    level: 'warning',
    code: 'UNDEFINED_VARIABLE',
    message: `${varName}: Variable is not defined in contract`,
    field: varName,
    suggestion: `Either add ${varName} to your contract or remove it from the environment file`,
  }));
}

/**
 * Generate summary message for validation errors
 */
export function generateSummaryMessage(
  diagnostics: Diagnostic[],
  total: number,
): string {
  const errors = diagnostics.filter((d) => d.level === 'error').length;
  const warnings = diagnostics.filter((d) => d.level === 'warning').length;

  const parts: string[] = [];

  if (errors > 0) {
    parts.push(`${errors} error${errors > 1 ? 's' : ''}`);
  }

  if (warnings > 0) {
    parts.push(`${warnings} warning${warnings > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return '✓ All variables valid';
  }

  return `✗ Found ${parts.join(' and ')} in ${total} variable${total > 1 ? 's' : ''}`;
}

/**
 * Format diagnostic for display
 */
export function formatDiagnostic(diagnostic: Diagnostic, verbose = false): string {
  const icon = diagnostic.level === 'error' ? '✗' : diagnostic.level === 'warning' ? '⚠' : 'ℹ';
  const lines: string[] = [
    `${icon} ${diagnostic.message}`,
  ];

  if (diagnostic.suggestion) {
    lines.push(`  💡 ${diagnostic.suggestion}`);
  }

  if (diagnostic.example && verbose) {
    lines.push(`  📝 Example: ${diagnostic.example}`);
  }

  return lines.join('\n');
}

/**
 * Private: Extract enum values from error message
 */
function extractEnumValues(expected: string): string {
  const match = expected.match(/\[(.*?)\]/);
  return match ? match[1] : expected;
}

/**
 * Private: Extract first enum value
 */
function extractFirstEnumValue(expected: string): string | undefined {
  const match = expected.match(/["']([^"']+)["']/);
  return match ? match[1] : undefined;
}

/**
 * Private: Extract max length
 */
function extractMaxLength(expected: string): number | undefined {
  const match = expected.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Private: Extract min length
 */
function extractMinLength(expected: string): number | undefined {
  const match = expected.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Private: Extract pattern
 */
function extractPattern(expected: string): string {
  const match = expected.match(/\/(.+?)\//);
  return match ? match[1] : expected;
}

/**
 * Private: Extract minimum value
 */
function extractMinimum(expected: string): number | undefined {
  const match = expected.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Private: Extract maximum value
 */
function extractMaximum(expected: string): number | undefined {
  const match = expected.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Private: Generate example based on variable
 */
function generateExample(variable: VariableDefinition | undefined): string | undefined {
  if (!variable) return undefined;

  const type = variable.type;
  switch (type.name) {
    case 'string':
      return 'my_value';
    case 'int':
    case 'number':
      return '3000';
    case 'boolean':
      return 'true';
    case 'url':
      return 'https://example.com';
    case 'json':
      return '{"key":"value"}';
    case 'secret':
      return '***';
    case 'enum':
      return (type as any).allowedValues?.[0];
    default:
      return undefined;
  }
}
