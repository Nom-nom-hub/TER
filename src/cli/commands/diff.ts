/**
 * Diff command - Compare two environments
 */

import * as fs from 'fs';
import { Schema } from '../../core/schema';
import { createEnvironment } from '../../runtime/environment';
import { Types } from '../../core/types';

export class DiffCommand {
  async run(args: string[]): Promise<void> {
    if (args.length < 2) {
      console.error('Usage: ter diff <env1.env> <env2.env> [--contract path]');
      process.exit(1);
    }

    const env1Path = args[0];
    const env2Path = args[1];
    const contractPath = this.getOptionValue(args, '--contract', '.ter.json');

    // Validate files exist
    if (!fs.existsSync(env1Path)) {
      console.error(`File not found: ${env1Path}`);
      process.exit(1);
    }
    if (!fs.existsSync(env2Path)) {
      console.error(`File not found: ${env2Path}`);
      process.exit(1);
    }

    // Load contract
    let schema: Schema;
    if (fs.existsSync(contractPath)) {
      const contractContent = fs.readFileSync(contractPath, 'utf-8');
      const contractData = JSON.parse(contractContent);
      schema = this.schemaFromJSON(contractData);
    } else {
      // Create a basic schema if no contract
      schema = this.createDefaultSchema();
    }

    // Load environments
    const env1Values = this.parseDotEnv(fs.readFileSync(env1Path, 'utf-8'));
    const env2Values = this.parseDotEnv(fs.readFileSync(env2Path, 'utf-8'));

    // Create environments
    const env1 = createEnvironment(schema, { fileEnv: env1Values });
    const env2 = createEnvironment(schema, { fileEnv: env2Values });

    // Diff
    console.log(`Comparing: ${env1Path} -> ${env2Path}\n`);

    const allKeys = new Set([
      ...Object.keys(env1Values),
      ...Object.keys(env2Values),
    ]);

    let hasDifferences = false;

    for (const key of Array.from(allKeys).sort()) {
      const val1 = env1Values[key];
      const val2 = env2Values[key];

      const display1 = env1.isSecret(key) ? '[SECRET]' : val1 || '(not set)';
      const display2 = env2.isSecret(key) ? '[SECRET]' : val2 || '(not set)';

      if (val1 !== val2) {
        hasDifferences = true;
        console.log(`${key}`);
        console.log(`  < ${display1}`);
        console.log(`  > ${display2}`);
      }
    }

    if (!hasDifferences) {
      console.log('No differences found');
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
        return Types.string();
    }
  }

  private createDefaultSchema(): Schema {
    // Empty schema - all vars are optional strings
    return new Schema();
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
