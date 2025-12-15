/**
 * Check command - Validate environment
 */

import * as fs from 'fs';
import * as path from 'path';
import { Schema } from '../../core/schema';
import { Types } from '../../core/types';
import { createEnvironment } from '../../runtime/environment';

export class CheckCommand {
  async run(args: string[]): Promise<void> {
    const contractPath = this.getOptionValue(args, '--contract', '.ter.json');
    const envFilePath = this.getOptionValue(args, '--env', '.env');

    // Load contract
    if (!fs.existsSync(contractPath)) {
      console.error(`Contract file not found: ${contractPath}`);
      console.error('Run "ter init" to create one.');
      process.exit(1);
    }

    const contractContent = fs.readFileSync(contractPath, 'utf-8');
    let contractData: any;

    try {
      contractData = JSON.parse(contractContent);
    } catch (err) {
      console.error(`Failed to parse contract file: ${err}`);
      process.exit(1);
    }

    // Reconstruct schema from contract
    const schema = this.schemaFromJSON(contractData);

    // Load .env file if it exists
    let fileEnv: Record<string, string> = {};
    if (fs.existsSync(envFilePath)) {
      fileEnv = this.parseDotEnv(fs.readFileSync(envFilePath, 'utf-8'));
    }

    // Create environment
    const env = createEnvironment(schema, { fileEnv });

    // Validate
    const validation = env.validate();

    if (validation.valid) {
      console.log('✓ Environment is valid');
      console.log('\nResolved variables:');
      const resolved = env.getResolved();
      for (const item of resolved) {
        const value = env.isSecret(item.name)
          ? '[SECRET]'
          : String(item.value);
        console.log(`  ${item.name}: ${value} (from ${item.metadata.source})`);
      }
      process.exit(0);
    } else {
      console.error('✗ Environment validation failed:\n');
      for (const error of validation.errors) {
        console.error(`  ${error.variable}: ${error.error}`);
      }
      process.exit(1);
    }
  }

  private schemaFromJSON(data: any): Schema {
    const schema = new Schema();
    const variables = data.variables || [];

    for (const v of variables) {
      const type = this.typeFromJSON(v);
      type.isRequired = v.required;
      if (v.defaultValue !== undefined) {
        type.defaultValue = v.defaultValue;
      }
      schema.define(v.name, type);
    }

    return schema;
  }

  private typeFromJSON(v: any): any {
    switch (v.type) {
      case 'string':
        return Types.string();
      case 'number':
        return Types.number();
      case 'int':
        return Types.int();
      case 'boolean':
        return Types.boolean();
      case 'enum':
        return Types.enum(v.values || []);
      case 'url':
        return Types.url();
      case 'json':
        return Types.json();
      case 'secret':
        return Types.secret();
      default:
        throw new Error(`Unknown type: ${v.type}`);
    }
  }

  private parseDotEnv(content: string): Record<string, string> {
    const env: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }

    return env;
  }

  private getOptionValue(args: string[], option: string, defaultValue: string): string {
    const index = args.indexOf(option);
    if (index === -1) return defaultValue;
    if (index + 1 < args.length) return args[index + 1];
    return defaultValue;
  }
}
