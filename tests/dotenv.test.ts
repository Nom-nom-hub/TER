/**
 * DotEnv Adapter Tests
 */

import {
  parseDotEnv,
  generateDotEnv,
  mergeDotEnv,
  diffDotEnv,
  validateDotEnv,
} from '../src/adapters/dotenv';

describe('DotEnv Adapter', () => {
  test('should parse basic key-value pairs', () => {
    const content = `
KEY1=value1
KEY2=value2
KEY3=value3
`;

    const result = parseDotEnv(content);

    expect(result.values.KEY1).toBe('value1');
    expect(result.values.KEY2).toBe('value2');
    expect(result.values.KEY3).toBe('value3');
    expect(result.errors).toHaveLength(0);
  });

  test('should skip comments and empty lines', () => {
    const content = `
# This is a comment
KEY1=value1

# Another comment
KEY2=value2
`;

    const result = parseDotEnv(content);

    expect(result.values).toHaveProperty('KEY1');
    expect(result.values).toHaveProperty('KEY2');
    expect(Object.keys(result.values)).toHaveLength(2);
  });

  test('should handle quoted values', () => {
    const content = `
KEY1="value with spaces"
KEY2='single quoted'
KEY3=unquoted
`;

    const result = parseDotEnv(content);

    expect(result.values.KEY1).toBe('value with spaces');
    expect(result.values.KEY2).toBe('single quoted');
    expect(result.values.KEY3).toBe('unquoted');
  });

  test('should handle escaped characters in quoted values', () => {
    const content = `
KEY1="value with \\"quotes\\""
KEY2="line1\\nline2"
KEY3="tab\\there"
`;

    const result = parseDotEnv(content);

    expect(result.values.KEY1).toContain('"');
    expect(result.values.KEY2).toContain('\n');
    expect(result.values.KEY3).toContain('\t');
  });

  test('should trim unquoted values by default', () => {
    const content = `
KEY1=   value with spaces   
KEY2="keep  spaces"
`;

    const result = parseDotEnv(content, { trimValues: true });

    expect(result.values.KEY1).toBe('value with spaces');
    expect(result.values.KEY2).toBe('keep  spaces');
  });

  test('should detect invalid key names', () => {
    const content = `
123_INVALID=value
VALID_KEY=value
_also_valid=value
`;

    const result = parseDotEnv(content);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Invalid key name');
  });

  test('should detect missing separator', () => {
    const content = `
VALID=value
INVALID no equals
ANOTHER=value
`;

    const result = parseDotEnv(content);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('missing =');
  });

  test('should generate .env file', () => {
    const values = {
      KEY1: 'value1',
      KEY2: 'value with spaces',
      KEY3: 'another',
    };

    const result = generateDotEnv(values);

    expect(result).toContain('KEY1=value1');
    expect(result).toContain('KEY2="value with spaces"');
    expect(result).toContain('KEY3=another');
  });

  test('should generate .env with comments', () => {
    const values = {
      KEY: 'value',
    };

    const result = generateDotEnv(values, { comments: true });

    expect(result).toContain('Environment Configuration');
    expect(result).toContain('TER');
  });

  test('should merge multiple env objects', () => {
    const env1 = {
      KEY1: 'value1',
      KEY2: 'old',
    };

    const env2 = {
      KEY2: 'new',
      KEY3: 'value3',
    };

    const merged = mergeDotEnv(env1, env2);

    expect(merged.KEY1).toBe('value1');
    expect(merged.KEY2).toBe('new'); // env2 overrides
    expect(merged.KEY3).toBe('value3');
  });

  test('should diff two env objects', () => {
    const old = {
      KEY1: 'value1',
      KEY2: 'old_value',
      KEY3: 'removed',
    };

    const new_values = {
      KEY1: 'value1',
      KEY2: 'new_value',
      KEY4: 'added',
    };

    const diff = diffDotEnv(old, new_values);

    expect(diff.added).toEqual({ KEY4: 'added' });
    expect(diff.removed).toEqual(['KEY3']);
    expect(diff.modified.KEY2).toEqual({ old: 'old_value', new: 'new_value' });
  });

  test('should validate valid .env content', () => {
    const content = `
KEY1=value1
KEY2=value2
`;

    const result = validateDotEnv(content);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should validate invalid .env content', () => {
    const content = `
VALID=value1
INVALID no separator
123_BADKEY=value
`;

    const result = validateDotEnv(content);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should handle complex real-world .env', () => {
    const content = `
# Database Configuration
DATABASE_URL="postgres://user:password@localhost:5432/db"
DATABASE_POOL_SIZE="20"

# API Keys
API_KEY="secret-key-123"
API_SECRET="another-secret"

# Feature Flags
ENABLE_CACHING="true"
DEBUG_MODE="false"

# URLs
APP_URL="https://example.com"
WEBHOOK_URL="https://api.example.com/webhook"
`;

    const result = parseDotEnv(content);

    expect(result.errors).toHaveLength(0);
    expect(result.values.DATABASE_URL).toBe('postgres://user:password@localhost:5432/db');
    expect(result.values.API_KEY).toBe('secret-key-123');
    expect(result.values.ENABLE_CACHING).toBe('true');
  });

  test('should handle empty .env file', () => {
    const content = `
# Just comments
# No actual values
`;

    const result = parseDotEnv(content);

    expect(Object.keys(result.values)).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  test('should preserve value types', () => {
    const content = `
STRING=hello
NUMBER=123
BOOLEAN=true
URL=https://example.com
JSON={"key":"value"}
`;

    const result = parseDotEnv(content);

    expect(result.values.STRING).toBe('hello');
    expect(result.values.NUMBER).toBe('123');
    expect(result.values.BOOLEAN).toBe('true');
    expect(result.values.URL).toBe('https://example.com');
    expect(result.values.JSON).toBe('{"key":"value"}');
  });
});
