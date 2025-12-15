/**
 * TER MCP Server
 * Model Context Protocol integration for AI assistants
 */

import * as fs from 'fs';
import { Schema } from '../core/schema';
import { Environment } from '../runtime/environment';
import { reconstructSchemaFromJSON } from '../core/schema-json';
import { schemaToJSONSchema } from '../core/json-schema';
import { parseDotEnv, generateDotEnv, diffDotEnv } from '../adapters/dotenv';
import { generateDiagnostic, findUndefinedVariables } from '../core/diagnostics';
import { MCPTool, MCPToolResult, MCPServer } from './types';

/**
 * TER MCP Server implementation
 */
export class TERMCPServer {
  private contractPath: string;
  private schema?: Schema;

  constructor(contractPath: string = '.ter.json') {
    this.contractPath = contractPath;
    this.loadContract();
  }

  /**
   * Get server metadata
   */
  getServerInfo(): MCPServer {
    return {
      name: 'TER',
      version: '0.1.0',
      tools: this.getTools(),
    };
  }

  /**
   * Get available tools
   */
  getTools(): MCPTool[] {
    return [
      this.toolValidateEnvironment(),
      this.toolExplainVariable(),
      this.toolCompareEnvironments(),
      this.toolExportSchema(),
      this.toolListVariables(),
      this.toolGetVariable(),
      this.toolValidateValue(),
    ];
  }

  /**
   * Execute a tool call
   */
  async executeTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    if (!this.schema) {
      return {
        type: 'error',
        content: 'Contract not loaded',
        isError: true,
      };
    }

    try {
      switch (name) {
        case 'validate_environment':
          return this.handleValidateEnvironment(args);
        case 'explain_variable':
          return this.handleExplainVariable(args);
        case 'compare_environments':
          return this.handleCompareEnvironments(args);
        case 'export_schema':
          return this.handleExportSchema(args);
        case 'list_variables':
          return this.handleListVariables(args);
        case 'get_variable':
          return this.handleGetVariable(args);
        case 'validate_value':
          return this.handleValidateValue(args);
        default:
          return {
            type: 'error',
            content: `Unknown tool: ${name}`,
            isError: true,
          };
      }
    } catch (error) {
      return {
        type: 'error',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }

  /**
   * Private: Tool definitions
   */

  private toolValidateEnvironment(): MCPTool {
    return {
      name: 'validate_environment',
      description: 'Validate an environment file against the contract',
      inputSchema: {
        type: 'object',
        properties: {
          envFile: {
            type: 'string',
            description: 'Path to .env file to validate',
          },
        },
        required: ['envFile'],
      },
    };
  }

  private toolExplainVariable(): MCPTool {
    return {
      name: 'explain_variable',
      description: 'Get detailed information about a variable',
      inputSchema: {
        type: 'object',
        properties: {
          variable: {
            type: 'string',
            description: 'Variable name to explain',
          },
        },
        required: ['variable'],
      },
    };
  }

  private toolCompareEnvironments(): MCPTool {
    return {
      name: 'compare_environments',
      description: 'Compare two environment files',
      inputSchema: {
        type: 'object',
        properties: {
          env1: {
            type: 'string',
            description: 'Path to first .env file',
          },
          env2: {
            type: 'string',
            description: 'Path to second .env file',
          },
        },
        required: ['env1', 'env2'],
      },
    };
  }

  private toolExportSchema(): MCPTool {
    return {
      name: 'export_schema',
      description: 'Export contract as JSON Schema Draft 7',
      inputSchema: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['json-schema', 'json'],
            description: 'Export format',
          },
        },
        required: [],
      },
    };
  }

  private toolListVariables(): MCPTool {
    return {
      name: 'list_variables',
      description: 'List all variables in the contract',
      inputSchema: {
        type: 'object',
        properties: {
          includeDefaults: {
            type: 'string',
            enum: ['true', 'false'],
            description: 'Include default values',
          },
        },
        required: [],
      },
    };
  }

  private toolGetVariable(): MCPTool {
    return {
      name: 'get_variable',
      description: 'Get definition of a specific variable',
      inputSchema: {
        type: 'object',
        properties: {
          variable: {
            type: 'string',
            description: 'Variable name',
          },
        },
        required: ['variable'],
      },
    };
  }

  private toolValidateValue(): MCPTool {
    return {
      name: 'validate_value',
      description: 'Validate a value for a specific variable',
      inputSchema: {
        type: 'object',
        properties: {
          variable: {
            type: 'string',
            description: 'Variable name',
          },
          value: {
            type: 'string',
            description: 'Value to validate',
          },
        },
        required: ['variable', 'value'],
      },
    };
  }

  /**
   * Private: Tool handlers
   */

  private handleValidateEnvironment(args: Record<string, unknown>): MCPToolResult {
    if (!this.schema) throw new Error('Schema not loaded');

    const envFile = String(args.envFile);
    if (!fs.existsSync(envFile)) {
      return {
        type: 'error',
        content: `Environment file not found: ${envFile}`,
        isError: true,
      };
    }

    const content = fs.readFileSync(envFile, 'utf-8');
    const parsed = parseDotEnv(content);

    if (parsed.errors.length > 0) {
      return {
        type: 'error',
        content: `Parse errors in ${envFile}:\n${parsed.errors.map((e) => `  Line ${e.line}: ${e.message}`).join('\n')}`,
        isError: true,
      };
    }

    const env = new Environment(this.schema, { fileEnv: parsed.values });
    env.init();
    const validation = env.validate();

    if (validation.valid) {
      return {
        type: 'text',
        content: `✓ ${envFile} is valid\n\nResolved:\n${env
          .getResolved()
          .map((r) => `  ${r.name}: ${env.isSecret(r.name) ? '[SECRET]' : r.value}`)
          .join('\n')}`,
      };
    }

    const errorDetails = validation.errors
      .map((e) => {
        const varDef = this.schema!.getVariable(e.variable);
        // e.error is a string from Environment validation
        // Create a simple error message
        const message = `${e.variable}: ${e.error}`;
        const suggestion = `Check the value for ${e.variable} in ${envFile}`;
        return `  ${message}\n    💡 ${suggestion}`;
      })
      .join('\n');

    return {
      type: 'error',
      content: `✗ Validation failed:\n${errorDetails}`,
      isError: true,
    };
  }

  private handleExplainVariable(args: Record<string, unknown>): MCPToolResult {
    if (!this.schema) throw new Error('Schema not loaded');

    const variable = String(args.variable);
    const varDef = this.schema.getVariable(variable);

    if (!varDef) {
      return {
        type: 'error',
        content: `Variable not found: ${variable}`,
        isError: true,
      };
    }

    const type = varDef.type;
    const typeAny = type as any;

    const lines: string[] = [
      `Variable: ${variable}`,
      `Type: ${type.name}`,
      `Required: ${type.isRequired}`,
      `Secret: ${type.isSecret}`,
    ];

    if (varDef.defaultValue !== undefined) {
      lines.push(`Default: ${JSON.stringify(varDef.defaultValue)}`);
    }

    if (varDef.description) {
      lines.push(`Description: ${varDef.description}`);
    }

    // Type-specific info
    if (type.name === 'string') {
      if (typeAny.minLength) lines.push(`Min length: ${typeAny.minLength}`);
      if (typeAny.maxLength) lines.push(`Max length: ${typeAny.maxLength}`);
      if (typeAny.pattern) lines.push(`Pattern: ${typeAny.pattern.source}`);
    }

    if (type.name === 'enum') {
      if (typeAny.allowedValues) {
        lines.push(`Allowed values: ${typeAny.allowedValues.join(', ')}`);
      }
    }

    if ((type.name === 'int' || type.name === 'number') && (typeAny.min || typeAny.max)) {
      if (typeAny.min) lines.push(`Minimum: ${typeAny.min}`);
      if (typeAny.max) lines.push(`Maximum: ${typeAny.max}`);
    }

    return {
      type: 'text',
      content: lines.join('\n'),
    };
  }

  private handleCompareEnvironments(args: Record<string, unknown>): MCPToolResult {
    const env1Path = String(args.env1);
    const env2Path = String(args.env2);

    if (!fs.existsSync(env1Path) || !fs.existsSync(env2Path)) {
      return {
        type: 'error',
        content: 'One or both environment files not found',
        isError: true,
      };
    }

    const env1 = parseDotEnv(fs.readFileSync(env1Path, 'utf-8')).values;
    const env2 = parseDotEnv(fs.readFileSync(env2Path, 'utf-8')).values;

    const diff = diffDotEnv(env1, env2);

    const lines: string[] = [
      `Comparing ${env1Path} vs ${env2Path}`,
      '',
    ];

    if (Object.keys(diff.added).length > 0) {
      lines.push('Added:');
      for (const [key, value] of Object.entries(diff.added)) {
        lines.push(`  +${key}: ${value}`);
      }
    }

    if (diff.removed.length > 0) {
      lines.push('Removed:');
      for (const key of diff.removed) {
        lines.push(`  -${key}`);
      }
    }

    if (Object.keys(diff.modified).length > 0) {
      lines.push('Modified:');
      for (const [key, { old, new: newVal }] of Object.entries(diff.modified)) {
        lines.push(`  ~${key}: ${old} → ${newVal}`);
      }
    }

    if (Object.keys(diff.added).length === 0 &&
        diff.removed.length === 0 &&
        Object.keys(diff.modified).length === 0) {
      lines.push('No differences');
    }

    return {
      type: 'json',
      content: JSON.stringify({
        added: diff.added,
        removed: diff.removed,
        modified: diff.modified,
      }, null, 2),
    };
  }

  private handleExportSchema(args: Record<string, unknown>): MCPToolResult {
    if (!this.schema) throw new Error('Schema not loaded');

    const format = String(args.format || 'json-schema');

    if (format === 'json-schema') {
      const jsonSchema = schemaToJSONSchema(this.schema);
      return {
        type: 'json',
        content: JSON.stringify(jsonSchema, null, 2),
      };
    }

    return {
      type: 'error',
      content: `Unknown format: ${format}`,
      isError: true,
    };
  }

  private handleListVariables(args: Record<string, unknown>): MCPToolResult {
    if (!this.schema) throw new Error('Schema not loaded');

    const variables = this.schema.getVariables();
    const lines: string[] = [
      `Total variables: ${variables.length}`,
      '',
    ];

    for (const varDef of variables) {
      lines.push(
        `${varDef.name} (${varDef.type.name})${varDef.type.isRequired ? ' [required]' : ''}`
      );
    }

    return {
      type: 'text',
      content: lines.join('\n'),
    };
  }

  private handleGetVariable(args: Record<string, unknown>): MCPToolResult {
    if (!this.schema) throw new Error('Schema not loaded');

    const variable = String(args.variable);
    const varDef = this.schema.getVariable(variable);

    if (!varDef) {
      return {
        type: 'error',
        content: `Variable not found: ${variable}`,
        isError: true,
      };
    }

    return {
      type: 'json',
      content: JSON.stringify({
        name: variable,
        type: varDef.type.name,
        required: varDef.type.isRequired,
        isSecret: varDef.type.isSecret,
        defaultValue: varDef.defaultValue,
        description: varDef.description,
      }, null, 2),
    };
  }

  private handleValidateValue(args: Record<string, unknown>): MCPToolResult {
    if (!this.schema) throw new Error('Schema not loaded');

    const variable = String(args.variable);
    const value = String(args.value);

    const varDef = this.schema.getVariable(variable);
    if (!varDef) {
      return {
        type: 'error',
        content: `Variable not found: ${variable}`,
        isError: true,
      };
    }

    const result = varDef.type.validate(value);

    if (result.valid) {
      return {
        type: 'text',
        content: `✓ "${value}" is valid for ${variable}`,
      };
    }

    const diagnostic = generateDiagnostic(result.error, varDef);

    return {
      type: 'error',
      content: `✗ ${diagnostic.message}\n💡 ${diagnostic.suggestion}${
        diagnostic.example ? `\n📝 Example: ${diagnostic.example}` : ''
      }`,
      isError: true,
    };
  }

  /**
   * Private: Load contract
   */
  private loadContract(): void {
    try {
      if (!fs.existsSync(this.contractPath)) {
        throw new Error(`Contract not found: ${this.contractPath}`);
      }

      const content = fs.readFileSync(this.contractPath, 'utf-8');
      const json = JSON.parse(content);
      this.schema = reconstructSchemaFromJSON(json);
    } catch (error) {
      throw new Error(`Failed to load contract: ${error}`);
    }
  }
}
