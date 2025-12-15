/**
 * Run command - Execute a command with validated environment
 */

import * as fs from 'fs';
import { spawn } from 'child_process';
import { Schema } from '../../core/schema';
import { createEnvironment } from '../../runtime/environment';
import { Types } from '../../core/types';

export class RunCommand {
  async run(args: string[]): Promise<void> {
    const contractPath = this.getOptionValue(args, '--contract', '.ter.json');
    const envFilePath = this.getOptionValue(args, '--env', '.env');

    // Find -- separator
    const separatorIndex = args.indexOf('--');
    if (separatorIndex === -1) {
      console.error('Usage: ter run [options] -- <command> [args...]');
      console.error('Example: ter run -- npm start');
      process.exit(1);
    }

    const command = args[separatorIndex + 1];
    const commandArgs = args.slice(separatorIndex + 2);

    if (!command) {
      console.error('No command specified after --');
      process.exit(1);
    }

    // Load contract if it exists
    let schema: Schema | null = null;
    if (fs.existsSync(contractPath)) {
      const contractContent = fs.readFileSync(contractPath, 'utf-8');
      const contractData = JSON.parse(contractContent);
      schema = this.schemaFromJSON(contractData);
    }

    // Load environment file if it exists
    let fileEnv: Record<string, string> = {};
    if (fs.existsSync(envFilePath)) {
      fileEnv = this.parseDotEnv(fs.readFileSync(envFilePath, 'utf-8'));
    }

    // If no schema, use process.env as-is
    if (!schema) {
      console.log(`[TER] No contract found at ${contractPath}, using process.env`);
      this.executeCommand(command, commandArgs, process.env as Record<string, string>);
      return;
    }

    // Create environment
    const env = createEnvironment(schema, { fileEnv });

    // Validate
    const validation = env.validate();
    if (!validation.valid) {
      console.error('[TER] Environment validation failed:\n');
      for (const error of validation.errors) {
        console.error(`  ${error.variable}: ${error.error}`);
      }
      process.exit(1);
    }

    console.log('[TER] Environment validated successfully');

    // Execute command with validated environment
    const envVars = env.toObject();
    this.executeCommand(command, commandArgs, {
      ...(process.env as Record<string, string>),
      ...envVars,
    });
  }

  private executeCommand(
    command: string,
    args: string[],
    env: Record<string, string>
  ): void {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      env,
      shell: true, // Windows compatibility
    });

    proc.on('error', (err) => {
      console.error(`[TER] Failed to execute command: ${err.message}`);
      process.exit(1);
    });

    proc.on('exit', (code) => {
      process.exit(code ?? 0);
    });
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
