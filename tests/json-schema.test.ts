/**
 * JSON Schema Export Tests
 */

import { schemaToJSONSchema, exportAsJSONSchema } from '../src/core/json-schema';
import { reconstructSchemaFromJSON, exportSchemaToJSON } from '../src/core/schema-json';
import * as Types from '../src/core/types';
import { createSchema } from '../src/core/schema';

describe('JSON Schema Export', () => {
  test('should export basic schema to JSON Schema', () => {
    const schema = createSchema({
      DATABASE_URL: new Types.URLType().markRequired(),
      PORT: new Types.IntType().default(3000),
      DEBUG: new Types.BooleanType().optional(),
    });

    const jsonSchema = schemaToJSONSchema(schema, 'Test Config');

    expect(jsonSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(jsonSchema.title).toBe('Test Config');
    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.additionalProperties).toBe(false);
    expect(jsonSchema.required).toContain('DATABASE_URL');
    expect(jsonSchema.required).not.toContain('PORT');
    expect(jsonSchema.required).not.toContain('DEBUG');
  });

  test('should export string constraints', () => {
    const schema = createSchema({
      HOSTNAME: new Types.StringType()
        .min(3)
        .max(255)
        .matches(/^[a-z0-9]+$/)
        .markRequired(),
    });

    const jsonSchema = schemaToJSONSchema(schema);
    const hostProp = jsonSchema.properties.HOSTNAME;

    expect(hostProp.type).toBe('string');
    expect(hostProp.minLength).toBe(3);
    expect(hostProp.maxLength).toBe(255);
    expect(hostProp.pattern).toBeDefined();
  });

  test('should export number constraints', () => {
    const schema = createSchema({
      PORT: new Types.IntType().minimum(1).maximum(65535).markRequired(),
      TIMEOUT: new Types.NumberType().minimum(0).maximum(30000),
    });

    const jsonSchema = schemaToJSONSchema(schema);

    expect(jsonSchema.properties.PORT.type).toBe('integer');
    expect(jsonSchema.properties.PORT.minimum).toBe(1);
    expect(jsonSchema.properties.PORT.maximum).toBe(65535);

    expect(jsonSchema.properties.TIMEOUT.type).toBe('number');
    expect(jsonSchema.properties.TIMEOUT.minimum).toBe(0);
    expect(jsonSchema.properties.TIMEOUT.maximum).toBe(30000);
  });

  test('should export enum type with values', () => {
    const schema = createSchema({
      NODE_ENV: new Types.EnumType(['dev', 'staging', 'prod']).default('dev'),
    });

    const jsonSchema = schemaToJSONSchema(schema);
    const envProp = jsonSchema.properties.NODE_ENV;

    expect(envProp.type).toBe('string');
    expect(envProp.enum).toEqual(['dev', 'staging', 'prod']);
  });

  test('should export URL type with format', () => {
    const schema = createSchema({
      API_URL: new Types.URLType().markRequired(),
    });

    const jsonSchema = schemaToJSONSchema(schema);
    const urlProp = jsonSchema.properties.API_URL;

    expect(urlProp.type).toBe('string');
    expect(urlProp.format).toBe('uri');
  });

  test('should export secret type with description', () => {
    const schema = createSchema({
      API_KEY: new Types.SecretType().markRequired(),
    });

    const jsonSchema = schemaToJSONSchema(schema);
    const keyProp = jsonSchema.properties.API_KEY;

    expect(keyProp.type).toBe('string');
    expect(keyProp.description).toContain('secret');
  });

  test('should generate pretty JSON string', () => {
    const schema = createSchema({
      TEST: new Types.StringType(),
    });

    const json = exportAsJSONSchema(schema, 'Test', true);

    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });

  test('should generate compact JSON string', () => {
    const schema = createSchema({
      TEST: new Types.StringType(),
    });

    const json = exportAsJSONSchema(schema, 'Test', false);

    expect(json).not.toContain('\n');
    expect(json.includes('  ')).toBe(false);
  });

  test('should reconstruct schema from JSON', () => {
    const original = createSchema({
      PORT: new Types.IntType().default(3000),
      DEBUG: new Types.BooleanType(),
    });

    const exported = exportSchemaToJSON(original);
    const reconstructed = reconstructSchemaFromJSON(exported);

    const originalVars = original.getVariables();
    const reconstructedVars = reconstructed.getVariables();

    expect(reconstructedVars).toHaveLength(originalVars.length);
    expect(reconstructedVars[0].name).toBe('PORT');
    expect(reconstructedVars[0].defaultValue).toBe(3000);
  });

  test('should preserve enum values in reconstruction', () => {
    const schema = createSchema({
      ENVIRONMENT: new Types.EnumType(['dev', 'test', 'prod']).default('dev'),
    });

    const exported = exportSchemaToJSON(schema);
    const reconstructed = reconstructSchemaFromJSON(exported);

    const varDef = reconstructed.getVariable('ENVIRONMENT');
    expect(varDef).toBeDefined();
    expect((varDef?.type as any).allowedValues).toEqual(['dev', 'test', 'prod']);
  });

  test('should include examples in properties', () => {
    const schema = createSchema({
      DATABASE_URL: new Types.URLType().markRequired(),
      PORT: new Types.IntType().default(3000),
      NODE_ENV: new Types.EnumType(['dev', 'prod']),
    });

    const jsonSchema = schemaToJSONSchema(schema);

    expect(jsonSchema.properties.DATABASE_URL.examples).toBeDefined();
    expect(jsonSchema.properties.DATABASE_URL.examples).toContain('https://example.com');
    expect(jsonSchema.properties.PORT.examples).toContain('3000');
    expect(jsonSchema.properties.NODE_ENV.examples).toContain('dev');
  });

  test('should handle JSON type', () => {
    const schema = createSchema({
      CONFIG: new Types.JSONType().markRequired(),
    });

    const jsonSchema = schemaToJSONSchema(schema);
    const configProp = jsonSchema.properties.CONFIG;

    expect(configProp.description).toContain('JSON');
  });

  test('should handle complex schema with all types', () => {
    const schema = createSchema({
      DATABASE_URL: new Types.URLType().markRequired(),
      PORT: new Types.IntType().default(5432),
      TIMEOUT: new Types.NumberType().minimum(0).maximum(30000),
      DEBUG: new Types.BooleanType(),
      API_KEY: new Types.SecretType().markRequired(),
      NODE_ENV: new Types.EnumType(['dev', 'staging', 'prod']).default('dev'),
      HOSTNAME: new Types.StringType().min(3).max(255),
      CONFIG: new Types.JSONType(),
    });

    const jsonSchema = schemaToJSONSchema(schema);

    expect(jsonSchema.required).toContain('DATABASE_URL');
    expect(jsonSchema.required).toContain('API_KEY');
    expect(jsonSchema.required).not.toContain('PORT');
    expect(Object.keys(jsonSchema.properties)).toHaveLength(8);
  });
});
