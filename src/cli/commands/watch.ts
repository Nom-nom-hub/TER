/**
 * CLI: Watch Command
 * Monitor environment files and reload on changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { EnvironmentWatcher } from '../../runtime/watcher';
import { Environment } from '../../runtime/environment';
import { Schema } from '../../core/schema';
import { reconstructSchemaFromJSON } from '../../core/schema-json';

interface WatchOptions {
  contract?: string;
  env?: string;
}

export class WatchCommand {
  async run(args: string[]): Promise<void> {
    const options = this.parseArgs(args);

    try {
      const contractPath = options.contract || '.ter.json';
      const envPath = options.env || '.env';

      // Check if files exist
      if (!fs.existsSync(contractPath)) {
        console.error(`✗ Contract file not found: ${contractPath}`);
        process.exit(1);
      }

      if (!fs.existsSync(envPath)) {
        console.error(`✗ Environment file not found: ${envPath}`);
        process.exit(1);
      }

      // Read and parse contract
      const contractContent = fs.readFileSync(contractPath, 'utf-8');
      let contractJSON: any;

      try {
        contractJSON = JSON.parse(contractContent);
      } catch (e) {
        console.error(`✗ Invalid JSON in contract: ${e}`);
        process.exit(1);
      }

      // Reconstruct schema from contract
      const schema = reconstructSchemaFromJSON(contractJSON);

      // Read .env file
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const envValues = this.parseEnvFile(envContent);

      // Create environment
      const env = new Environment(schema);
      for (const [key, value] of Object.entries(envValues)) {
        (env as any).injectedValues[key] = value;
      }

      // Validate initial state
      const validation = env.validate();
      if (!validation.valid) {
        console.error('✗ Initial environment validation failed:');
        for (const err of validation.errors) {
          const reason = typeof err.error === 'object' && err.error !== null && 'reason' in err.error
            ? (err.error as any).reason
            : String(err.error);
          console.error(`  ${err.variable}: ${reason}`);
        }
        process.exit(1);
      }

      console.log(`✓ Environment valid. Watching: ${envPath}`);
      console.log(`  Press Ctrl+C to stop watching`);
      console.log('');

      // Create watcher
      const watcher = new EnvironmentWatcher({
        debounceMs: 500,
        onReload: (env, change) => {
          const timestamp = new Date().toLocaleTimeString();
          console.log(`[${timestamp}] ${change.type.toUpperCase()}: ${change.variables.join(', ')}`);

          // Validate after reload
          const validation = env.validate();
          if (!validation.valid) {
            console.error(`  ✗ Validation failed:`);
            for (const err of validation.errors) {
              const reason = typeof err.error === 'object' && err.error !== null && 'reason' in err.error
                ? (err.error as any).reason
                : String(err.error);
              console.error(`    ${err.variable}: ${reason}`);
            }
          } else {
            console.log(`  ✓ Valid`);
          }
        },
        onError: (error) => {
          console.error(`✗ Watch error: ${error.message}`);
        },
      });

      // Start watching
      watcher.watch(envPath, env);

      // Keep process alive
      process.on('SIGINT', () => {
        console.log('\n✓ Stopped watching');
        watcher.unwatchAll();
        process.exit(0);
      });
    } catch (error) {
      console.error(`✗ Error: ${error}`);
      process.exit(1);
    }
  }

  private parseArgs(args: string[]): WatchOptions {
    const options: WatchOptions = {};

    for (let i = 0; i < args.length; i++) {
      if ((args[i] === '--contract' || args[i] === '-c') && i + 1 < args.length) {
        options.contract = args[++i];
      } else if ((args[i] === '--env' || args[i] === '-e') && i + 1 < args.length) {
        options.env = args[++i];
      }
    }

    return options;
  }

  private parseEnvFile(content: string): Record<string, string> {
    const values: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex === -1) {
        continue;
      }

      const key = trimmed.substring(0, equalsIndex).trim();
      let value = trimmed.substring(equalsIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      values[key] = value;
    }

    return values;
  }
}
