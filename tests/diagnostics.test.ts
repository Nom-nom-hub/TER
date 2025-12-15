/**
 * Diagnostics Tests
 */

import {
  generateDiagnostic,
  generateSummaryMessage,
  formatDiagnostic,
  findUndefinedVariables,
  generateUndefinedDiagnostics,
  Diagnostic,
} from '../src/core/diagnostics';
import { createSchema } from '../src/core/schema';
import * as Types from '../src/core/types';
import { TypeValidationError } from '../src/core/types';

describe('Diagnostics', () => {
  test('should generate diagnostic for missing required', () => {
    const schema = createSchema({
      API_KEY: new Types.StringType().markRequired(),
    });
    const variable = schema.getVariable('API_KEY');

    const error: TypeValidationError = {
      field: 'API_KEY',
      value: undefined,
      expected: 'string',
      reason: 'Value is required',
    };

    const diagnostic = generateDiagnostic(error, variable);

    expect(diagnostic.level).toBe('error');
    expect(diagnostic.code).toBe('MISSING_REQUIRED');
    expect(diagnostic.message).toContain('Required variable is missing');
    expect(diagnostic.suggestion).toBeDefined();
  });

  test('should generate diagnostic for invalid URL', () => {
    const error: TypeValidationError = {
      field: 'DATABASE_URL',
      value: 'not-a-url',
      expected: 'URL',
      reason: 'Value is not a valid URL',
    };

    const diagnostic = generateDiagnostic(error, undefined);

    expect(diagnostic.code).toBe('INVALID_URL');
    expect(diagnostic.suggestion).toContain('protocol');
  });

  test('should generate diagnostic for invalid number', () => {
    const error: TypeValidationError = {
      field: 'PORT',
      value: 'abc',
      expected: 'number',
      reason: 'Value is not a valid number',
    };

    const diagnostic = generateDiagnostic(error, undefined);

    expect(diagnostic.code).toBe('INVALID_NUMBER');
    expect(diagnostic.example).toBeDefined();
  });

  test('should generate diagnostic for invalid integer', () => {
    const error: TypeValidationError = {
      field: 'COUNT',
      value: '3.14',
      expected: 'integer',
      reason: 'Value is not a valid integer',
    };

    const diagnostic = generateDiagnostic(error, undefined);

    expect(diagnostic.code).toBe('INVALID_INTEGER');
  });

  test('should generate diagnostic for invalid boolean', () => {
    const error: TypeValidationError = {
      field: 'DEBUG',
      value: 'maybe',
      expected: 'boolean',
      reason: 'Value is not a valid boolean',
    };

    const diagnostic = generateDiagnostic(error, undefined);

    expect(diagnostic.code).toBe('INVALID_BOOLEAN');
    expect(diagnostic.suggestion).toContain('true');
  });

  test('should generate diagnostic for invalid enum', () => {
    const error: TypeValidationError = {
      field: 'NODE_ENV',
      value: 'staging',
      expected: '[dev, prod]',
      reason: 'Value is not one of the allowed values',
    };

    const diagnostic = generateDiagnostic(error, undefined);

    expect(diagnostic.code).toBe('INVALID_ENUM');
    expect(diagnostic.suggestion).toContain('Allowed values');
  });

  test('should generate diagnostic for string too long', () => {
    const error: TypeValidationError = {
      field: 'NAME',
      value: 'a'.repeat(300),
      expected: 'string with maximum length 100',
      reason: 'String length 300 is greater than maximum 100',
    };

    const diagnostic = generateDiagnostic(error, undefined);

    expect(diagnostic.code).toBe('STRING_TOO_LONG');
    expect(diagnostic.suggestion).toContain('100');
  });

  test('should generate diagnostic for string too short', () => {
    const error: TypeValidationError = {
      field: 'USERNAME',
      value: 'ab',
      expected: 'string with minimum length 3',
      reason: 'String length 2 is less than minimum 3',
    };

    const diagnostic = generateDiagnostic(error, undefined);

    expect(diagnostic.code).toBe('STRING_TOO_SHORT');
    expect(diagnostic.suggestion).toContain('3');
  });

  test('should generate diagnostic for invalid pattern', () => {
    const error: TypeValidationError = {
      field: 'EMAIL',
      value: 'notanemail',
      expected: 'string matching pattern /^[a-z]+@/',
      reason: 'String does not match required pattern',
    };

    const diagnostic = generateDiagnostic(error, undefined);

    expect(diagnostic.code).toBe('INVALID_PATTERN');
  });

  test('should generate diagnostic for invalid JSON', () => {
    const error: TypeValidationError = {
      field: 'CONFIG',
      value: '{bad json}',
      expected: 'JSON',
      reason: 'Value is not valid JSON',
    };

    const diagnostic = generateDiagnostic(error, undefined);

    expect(diagnostic.code).toBe('INVALID_JSON');
    expect(diagnostic.example).toBe('{"key":"value"}');
  });

  test('should generate summary for multiple errors', () => {
    const diagnostics: Diagnostic[] = [
      { level: 'error', code: 'MISSING', message: 'Error 1', field: 'VAR1' },
      { level: 'error', code: 'INVALID', message: 'Error 2', field: 'VAR2' },
      { level: 'warning', code: 'UNDEFINED', message: 'Warning 1', field: 'VAR3' },
    ];

    const summary = generateSummaryMessage(diagnostics, 3);

    expect(summary).toContain('2 errors');
    expect(summary).toContain('1 warning');
  });

  test('should generate summary for no errors', () => {
    const diagnostics: Diagnostic[] = [];
    const summary = generateSummaryMessage(diagnostics, 5);

    expect(summary).toContain('✓');
    expect(summary).toContain('valid');
  });

  test('should format diagnostic with icon', () => {
    const diagnostic: Diagnostic = {
      level: 'error',
      code: 'TEST',
      message: 'Test error',
      suggestion: 'Try this',
    };

    const formatted = formatDiagnostic(diagnostic);

    expect(formatted).toContain('✗');
    expect(formatted).toContain('Test error');
    expect(formatted).toContain('💡');
    expect(formatted).toContain('Try this');
  });

  test('should find undefined variables', () => {
    const schema = createSchema({
      DEFINED: new Types.StringType(),
    });

    const values = {
      DEFINED: 'value',
      UNDEFINED: 'value',
      ALSO_UNDEFINED: 'value',
    };

    const undefined_vars = findUndefinedVariables(values, schema);

    expect(undefined_vars).toContain('UNDEFINED');
    expect(undefined_vars).toContain('ALSO_UNDEFINED');
    expect(undefined_vars).not.toContain('DEFINED');
  });

  test('should generate diagnostics for undefined variables', () => {
    const undefined_vars = ['UNDEFINED1', 'UNDEFINED2'];
    const diagnostics = generateUndefinedDiagnostics(undefined_vars);

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].level).toBe('warning');
    expect(diagnostics[0].code).toBe('UNDEFINED_VARIABLE');
  });
});
