/**
 * Interactive CLI mode for TER
 * Provides REPL, wizard, and interactive configuration
 */

import readline from 'readline';
import { Schema } from '../core/schema';
import { Environment } from '../runtime/environment';
import { Resolver } from '../runtime/resolver';

interface InteractiveOptions {
  schema: Schema;
  inputStream?: NodeJS.ReadableStream;
  outputStream?: NodeJS.WritableStream;
}

export class InteractiveCLI {
  private schema: Schema;
  private resolver: Resolver;
  private rl: readline.Interface;
  private running = true;
  private values: Map<string, string> = new Map();

  constructor(options: InteractiveOptions) {
    this.schema = options.schema;
    this.resolver = new Resolver(this.schema);
    
    this.rl = readline.createInterface({
      input: options.inputStream || process.stdin,
      output: options.outputStream || process.stdout,
      prompt: 'ter> '
    });
  }

  async start(): Promise<void> {
    this.printWelcome();
    this.rl.prompt();

    return new Promise((resolve) => {
      this.rl.on('line', async (line) => {
        const input = line.trim();
        
        if (!input) {
          this.rl.prompt();
          return;
        }

        const result = await this.handleCommand(input);
        
        if (!this.running) {
          this.rl.close();
          resolve();
        } else {
          this.rl.prompt();
        }
      });

      this.rl.on('close', () => {
        resolve();
      });
    });
  }

  private printWelcome(): void {
    console.log('\n╔═══════════════════════════════════╗');
    console.log('║  TER Interactive Configuration   ║');
    console.log('║  Type "help" for available commands║');
    console.log('╚═══════════════════════════════════╝\n');
  }

  private async handleCommand(input: string): Promise<void> {
    const [command, ...args] = input.split(/\s+/);

    switch (command.toLowerCase()) {
      case 'help':
        this.printHelp();
        break;

      case 'list':
      case 'ls':
        this.listVariables();
        break;

      case 'set':
        this.setVariable(args[0], args.slice(1).join(' '));
        break;

      case 'get':
        this.getVariable(args[0]);
        break;

      case 'delete':
      case 'del':
        this.deleteVariable(args[0]);
        break;

      case 'show':
        this.showVariable(args[0]);
        break;

      case 'validate':
      case 'check':
        this.validateEnvironment();
        break;

      case 'wizard':
        await this.startWizard();
        break;

      case 'export':
        this.exportConfig(args[0]);
        break;

      case 'import':
        this.importConfig(args[0]);
        break;

      case 'clear':
        this.clearVariables();
        break;

      case 'exit':
      case 'quit':
        this.running = false;
        console.log('Goodbye!');
        break;

      default:
        console.log(`Unknown command: ${command}. Type "help" for available commands.`);
    }
  }

  private printHelp(): void {
    console.log(`
Available Commands:
  list, ls              List all variables
  set <name> <value>    Set variable value
  get <name>            Get variable value
  delete, del <name>    Delete variable
  show <name>           Show variable details (type, constraints)
  validate, check       Validate all variables
  wizard                Start interactive configuration wizard
  export <file>         Export configuration to .env file
  import <file>         Import configuration from .env file
  clear                 Clear all values
  help                  Show this help message
  exit, quit            Exit interactive mode
    `);
  }

  private listVariables(): void {
    const variables = this.schema.getVariables();
    
    if (Object.keys(variables).length === 0) {
      console.log('No variables defined.');
      return;
    }

    console.log('\nVariables:');
    console.log('───────────────────────────────────');
    
    for (const [name, varDef] of Object.entries(variables)) {
      const value = this.values.get(name);
      const hasValue = value ? '✓' : '✗';
      const required = varDef.type.isRequired ? '[R]' : '[O]';
      const display = value ? `${value.substring(0, 40)}...` : '<not set>';
      
      console.log(`${hasValue} ${required} ${name.padEnd(25)} = ${display}`);
    }
    
    console.log('───────────────────────────────────');
  }

  private setVariable(name: string, value: string): void {
    const varDef = this.schema.getVariable(name);
    
    if (!varDef) {
      console.log(`Variable not found: ${name}`);
      return;
    }

    const result = varDef.type.validate(value);
    
    if (!result.valid) {
      console.log(`❌ Validation error: ${result.error}`);
      return;
    }

    this.values.set(name, value);
    console.log(`✓ Set ${name} = ${value}`);
  }

  private getVariable(name: string): void {
    const value = this.values.get(name);
    
    if (!value) {
      const varDef = this.schema.getVariable(name);
      if (varDef?.type.defaultValue !== null && varDef?.type.defaultValue !== undefined) {
        console.log(`${name} = ${varDef?.type.defaultValue} (default)`);
      } else {
        console.log(`${name} is not set`);
      }
      return;
    }

    const varDef = this.schema.getVariable(name);
    const isSecret = varDef?.type.toString().includes('SecretType');
    const display = isSecret ? '***REDACTED***' : value;
    
    console.log(`${name} = ${display}`);
  }

  private deleteVariable(name: string): void {
    if (!this.values.has(name)) {
      console.log(`Variable not set: ${name}`);
      return;
    }

    this.values.delete(name);
    console.log(`✓ Deleted ${name}`);
  }

  private showVariable(name: string): void {
    const varDef = this.schema.getVariable(name);
    
    if (!varDef) {
      console.log(`Variable not found: ${name}`);
      return;
    }

    console.log(`\n${name}:`);
    console.log(`  Type:        ${varDef.type.constructor.name}`);
    console.log(`  Required:    ${varDef.type.isRequired ? 'yes' : 'no'}`);
    console.log(`  Default:     ${varDef.type.defaultValue ?? 'none'}`);
    console.log(`  Description: ${varDef.description || 'none'}`);
    
    const typeString = varDef.type.toString();
    if (typeString.includes('constraints')) {
      console.log(`  Constraints: ${typeString}`);
    }
    
    console.log('');
  }

  private validateEnvironment(): void {
    const envValues = Object.fromEntries(this.values);
    
    try {
      const result = this.schema.validate(envValues);
      console.log('✓ All required variables are valid!');
      console.log('\nResolved values:');
      
      for (const [key, value] of Object.entries(result)) {
        console.log(`  ${key} = ${value}`);
      }
    } catch (error) {
      console.log('❌ Validation failed:');
      console.log(`  ${(error as Error).message}`);
    }
  }

  private async startWizard(): Promise<void> {
    console.log('\n🧙 Configuration Wizard\n');
    
    const variables = this.schema.getVariables();
    let completed = 0;

    for (const [name, varDef] of Object.entries(variables)) {
      const current = this.values.get(name);
      const defaultValue = varDef.type.defaultValue;
      const isRequired = varDef.type.isRequired;
      
      const prompt = `${completed + 1}/${Object.keys(variables).length} ${name}`;
      const hint = current ? ` [${current}]` : defaultValue ? ` [${defaultValue}]` : isRequired ? ' (required)' : ' (optional)';
      
      const value = await this.prompt(prompt + hint + ': ');
      
      if (value) {
        const result = varDef.type.validate(value);
        if (result.valid) {
          this.values.set(name, value);
          console.log('✓');
        } else {
          console.log(`❌ Invalid: ${result.error}`);
        }
      } else if (current || defaultValue) {
        console.log('⊘ Skipped');
      } else if (isRequired) {
        console.log('❌ This field is required');
      }
      
      completed++;
    }

    console.log('\n✓ Configuration wizard complete!');
  }

  private exportConfig(filename: string): void {
    const fs = require('fs');
    const lines: string[] = [];

    for (const [name, value] of this.values.entries()) {
      if (value.includes(' ') || value.includes('=')) {
        lines.push(`${name}="${value}"`);
      } else {
        lines.push(`${name}=${value}`);
      }
    }

    const content = lines.join('\n');
    
    try {
      fs.writeFileSync(filename || '.env', content);
      console.log(`✓ Exported to ${filename || '.env'}`);
    } catch (error) {
      console.log(`❌ Failed to write file: ${(error as Error).message}`);
    }
  }

  private importConfig(filename: string): void {
    const fs = require('fs');
    
    try {
      const content = fs.readFileSync(filename, 'utf-8');
      const lines = content.split('\n');
      let imported = 0;

      for (const line of lines) {
        if (!line.trim() || line.startsWith('#')) continue;
        
        const [name, ...valueParts] = line.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        
        const varDef = this.schema.getVariable(name.trim());
        if (!varDef) continue;
        
        const result = varDef.type.validate(value);
        if (result.valid) {
          this.values.set(name.trim(), value);
          imported++;
        }
      }

      console.log(`✓ Imported ${imported} variables from ${filename}`);
    } catch (error) {
      console.log(`❌ Failed to read file: ${(error as Error).message}`);
    }
  }

  private clearVariables(): void {
    this.values.clear();
    console.log('✓ Cleared all values');
  }

  private prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

/**
 * Start interactive CLI mode
 */
export async function startInteractive(schema: Schema): Promise<void> {
  const cli = new InteractiveCLI({ schema });
  await cli.start();
}
