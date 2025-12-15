/**
 * Basic TER functionality tests
 */

import { Types, createSchema } from '../src/core';
import { createEnvironment } from '../src/runtime';

describe('TER Basic Tests', () => {
  test('String type validation', () => {
    const type = Types.string();
    const result = type.validate('hello');
    if (result.valid) {
      expect(result.value).toBe('hello');
    } else {
      throw new Error('Should be valid');
    }
  });

  test('Required string validation fails when missing', () => {
    const type = Types.string();
    type.markRequired();
    const result = type.validate(undefined);
    if (!result.valid) {
      expect(result.error.reason).toContain('required');
    } else {
      throw new Error('Should be invalid');
    }
  });

  test('Int type validation', () => {
    const type = Types.int();
    const result = type.validate('42');
    if (result.valid) {
      expect(result.value).toBe(42);
    } else {
      throw new Error('Should be valid');
    }
  });

  test('Int type fails on non-integer', () => {
    const type = Types.int();
    const result = type.validate('42.5');
    expect(result.valid).toBe(false);
  });

  test('Boolean type validation', () => {
    expect(Types.boolean().validate('true').valid).toBe(true);
    expect(Types.boolean().validate('false').valid).toBe(true);
    expect(Types.boolean().validate('yes').valid).toBe(true);
    expect(Types.boolean().validate('no').valid).toBe(true);
    expect(Types.boolean().validate('1').valid).toBe(true);
    expect(Types.boolean().validate('0').valid).toBe(true);
  });

  test('Enum type validation', () => {
    const type = Types.enum(['dev', 'prod']);
    expect(type.validate('dev').valid).toBe(true);
    expect(type.validate('prod').valid).toBe(true);
    expect(type.validate('staging').valid).toBe(false);
  });

  test('URL type validation', () => {
    const type = Types.url();
    expect(type.validate('http://example.com').valid).toBe(true);
    expect(type.validate('https://api.example.com/path').valid).toBe(true);
    expect(type.validate('not-a-url').valid).toBe(false);
  });

  test('JSON type validation', () => {
    const type = Types.json();
    const result = type.validate('{"key":"value"}');
    if (result.valid) {
      expect(result.value).toEqual({ key: 'value' });
    } else {
      throw new Error('Should be valid');
    }
  });

  test('Secret type is marked as secret', () => {
    const type = Types.secret();
    expect(type.isSecret).toBe(true);
  });

  test('Default value is used when value is missing', () => {
    const type = Types.string().default('default_value');
    const result = type.validate(undefined);
    if (result.valid) {
      expect(result.value).toBe('default_value');
    } else {
      throw new Error('Should be valid');
    }
  });

  test('Schema with multiple variables', () => {
    const schema = createSchema({
      DATABASE_URL: Types.url(),
      PORT: Types.int().default(3000),
      NODE_ENV: Types.enum(['dev', 'prod']).default('dev'),
      API_KEY: Types.secret(),
    });

    expect(schema.getVariables().length).toBe(4);
    expect(schema.hasVariable('DATABASE_URL')).toBe(true);
    expect(schema.hasVariable('UNKNOWN')).toBe(false);
  });

  test('Environment resolution with defaults', () => {
    const schema = createSchema({
      PORT: Types.int().default(3000),
      HOST: Types.string().default('localhost'),
    });

    const env = createEnvironment(schema);
    expect(env.getInt('PORT')).toBe(3000);
    expect(env.getString('HOST')).toBe('localhost');
  });

  test('Environment with file-based values', () => {
    const schema = createSchema({
      DATABASE_URL: Types.url(),
      API_KEY: Types.secret(),
    });

    const env = createEnvironment(schema, {
      fileEnv: {
        DATABASE_URL: 'postgres://localhost/db',
        API_KEY: 'secret123',
      },
    });

    expect(env.getString('DATABASE_URL')).toBe('postgres://localhost/db');
    expect(env.getString('API_KEY')).toBe('secret123');
  });

  test('Validation detects missing required values', () => {
    const schema = createSchema({
      API_KEY: (() => {
        const t = Types.secret();
        t.markRequired();
        return t;
      })(),
    });

    const env = createEnvironment(schema);
    const validation = env.validate();
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('Secret values are hidden in getAllValues', () => {
    const schema = createSchema({
      DATABASE_URL: Types.url(),
      API_KEY: Types.secret(),
    });

    const env = createEnvironment(schema, {
      fileEnv: {
        DATABASE_URL: 'postgres://localhost/db',
        API_KEY: 'secret123',
      },
    });

    const values = env.getAllValues(true);
    expect(values.DATABASE_URL).toBe('postgres://localhost/db');
    expect(values.API_KEY).toBe('[SECRET]');
  });

  test('Schema toJSON for contract export', () => {
    const schema = createSchema({
      PORT: Types.int().default(3000),
      API_KEY: Types.secret(),
    });

    const contractData = schema.toJSON();
    expect(contractData.version).toBe('1.0');
    expect(contractData.variables.length).toBe(2);
    expect(contractData.variables[0].type).toBe('int');
    expect(contractData.variables[1].isSecret).toBe(true);
  });
});
