/**
 * MCP Server Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TERMCPServer } from '../src/mcp/server';
import { createSchema } from '../src/core/schema';
import * as Types from '../src/core/types';
import { exportSchemaToJSON } from '../src/core/schema-json';
import { generateDotEnv } from '../src/adapters/dotenv';

describe('MCP Server', () => {
  let tempDir: string;
  let contractFile: string;
  let envFile: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ter-mcp-test-'));
    contractFile = path.join(tempDir, '.ter.json');
    envFile = path.join(tempDir, '.env');

    // Create test contract
    const schema = createSchema({
      DATABASE_URL: new Types.URLType().markRequired(),
      PORT: new Types.IntType().default(5432),
      NODE_ENV: new Types.EnumType(['dev', 'prod', 'test']).default('dev'),
      API_KEY: new Types.SecretType(),
    });

    const json = exportSchemaToJSON(schema);
    fs.writeFileSync(contractFile, JSON.stringify(json, null, 2));

    // Create test .env
    const env = {
      DATABASE_URL: 'postgres://localhost/db',
      PORT: '5432',
      NODE_ENV: 'prod',
      API_KEY: 'secret123',
    };
    fs.writeFileSync(envFile, generateDotEnv(env));
  });

  afterEach(() => {
    if (fs.existsSync(contractFile)) fs.unlinkSync(contractFile);
    if (fs.existsSync(envFile)) fs.unlinkSync(envFile);
    if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
  });

  test('should create MCP server', () => {
    const server = new TERMCPServer(contractFile);
    expect(server).toBeDefined();
  });

  test('should get server info', () => {
    const server = new TERMCPServer(contractFile);
    const info = server.getServerInfo();

    expect(info.name).toBe('TER');
    expect(info.version).toBe('0.1.0');
    expect(info.tools.length).toBeGreaterThan(0);
  });

  test('should list available tools', () => {
    const server = new TERMCPServer(contractFile);
    const tools = server.getTools();

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain('validate_environment');
    expect(toolNames).toContain('explain_variable');
    expect(toolNames).toContain('compare_environments');
    expect(toolNames).toContain('export_schema');
    expect(toolNames).toContain('list_variables');
    expect(toolNames).toContain('get_variable');
    expect(toolNames).toContain('validate_value');
  });

  test('should validate environment', async () => {
    const server = new TERMCPServer(contractFile);
    const result = await server.executeTool('validate_environment', {
      envFile,
    });

    expect(result.type).toBe('text');
    expect(result.content).toContain('valid');
  });

  test('should explain variable', async () => {
    const server = new TERMCPServer(contractFile);
    const result = await server.executeTool('explain_variable', {
      variable: 'DATABASE_URL',
    });

    expect(result.type).toBe('text');
    expect(result.content).toContain('DATABASE_URL');
    expect(result.content).toContain('url');
  });

  test('should handle unknown variable', async () => {
    const server = new TERMCPServer(contractFile);
    const result = await server.executeTool('explain_variable', {
      variable: 'UNKNOWN_VAR',
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain('not found');
  });

  test('should list variables', async () => {
    const server = new TERMCPServer(contractFile);
    const result = await server.executeTool('list_variables', {});

    expect(result.type).toBe('text');
    expect(result.content).toContain('DATABASE_URL');
    expect(result.content).toContain('PORT');
    expect(result.content).toContain('NODE_ENV');
    expect(result.content).toContain('API_KEY');
  });

  test('should get variable details', async () => {
    const server = new TERMCPServer(contractFile);
    const result = await server.executeTool('get_variable', {
      variable: 'PORT',
    });

    expect(result.type).toBe('json');
    const json = JSON.parse(result.content);
    expect(json.name).toBe('PORT');
    expect(json.type).toBe('int');
    expect(json.defaultValue).toBe(5432);
  });

  test('should validate value', async () => {
    const server = new TERMCPServer(contractFile);
    const result = await server.executeTool('validate_value', {
      variable: 'PORT',
      value: '8080',
    });

    expect(result.type).toBe('text');
    expect(result.content).toContain('valid');
  });

  test('should reject invalid value', async () => {
    const server = new TERMCPServer(contractFile);
    const result = await server.executeTool('validate_value', {
      variable: 'PORT',
      value: 'not-a-number',
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain('not a valid');
  });

  test('should export schema', async () => {
    const server = new TERMCPServer(contractFile);
    const result = await server.executeTool('export_schema', {
      format: 'json-schema',
    });

    expect(result.type).toBe('json');
    const schema = JSON.parse(result.content);
    expect(schema.$schema).toContain('json-schema.org');
    expect(schema.properties).toBeDefined();
  });

  test('should compare environments', async () => {
    const server = new TERMCPServer(contractFile);

    // Create second env file
    const env2File = path.join(tempDir, '.env2');
    const env2 = {
      DATABASE_URL: 'postgres://prod/db',
      PORT: '5433',
      NODE_ENV: 'prod',
    };
    fs.writeFileSync(env2File, generateDotEnv(env2));

    const result = await server.executeTool('compare_environments', {
      env1: envFile,
      env2: env2File,
    });

    expect(result.type).toBe('json');
    const diff = JSON.parse(result.content);
    expect(diff.modified).toBeDefined();
    expect(diff.removed).toBeDefined();

    fs.unlinkSync(env2File);
  });

  test('should handle missing environment file', async () => {
    const server = new TERMCPServer(contractFile);
    const result = await server.executeTool('validate_environment', {
      envFile: path.join(tempDir, 'nonexistent.env'),
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain('not found');
  });

  test('should handle unknown tool', async () => {
    const server = new TERMCPServer(contractFile);
    const result = await server.executeTool('unknown_tool', {});

    expect(result.isError).toBe(true);
    expect(result.content).toContain('Unknown tool');
  });

  test('tool schema is valid', () => {
    const server = new TERMCPServer(contractFile);
    const tools = server.getTools();

    for (const tool of tools) {
      // All tools must have valid schema
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
      expect(Array.isArray(tool.inputSchema.required)).toBe(true);
    }
  });

  test('should validate environment with parse errors', async () => {
    const server = new TERMCPServer(contractFile);

    // Create invalid env
    const badEnvFile = path.join(tempDir, '.bad.env');
    fs.writeFileSync(badEnvFile, 'KEY=value\nINVALID no equals sign\n');

    const result = await server.executeTool('validate_environment', {
      envFile: badEnvFile,
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain('Parse errors');

    fs.unlinkSync(badEnvFile);
  });

  test('should handle missing required variables', async () => {
    const server = new TERMCPServer(contractFile);

    // Create env without required field
    const incompleteEnvFile = path.join(tempDir, '.incomplete.env');
    fs.writeFileSync(incompleteEnvFile, 'PORT=5432\nNODE_ENV=dev\n');

    const result = await server.executeTool('validate_environment', {
      envFile: incompleteEnvFile,
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain('Validation failed');

    fs.unlinkSync(incompleteEnvFile);
  });
});
