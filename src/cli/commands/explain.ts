/**
 * Explain command - Show details about a variable
 */

import * as fs from 'fs';
import { Schema } from '../../core/schema';
import { Types } from '../../core/types';

export class ExplainCommand {
  async run(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.error('Usage: ter explain <VARIABLE_NAME> [--contract path]');
      process.exit(1);
    }

    const varName = args[0];
    const contractPath = this.getOptionValue(args, '--contract', '.ter.json');

    // Load contract
    if (!fs.existsSync(contractPath)) {
      console.error(`Contract file not found: ${contractPath}`);
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

    // Find variable
    const variable = (contractData.variables || []).find((v: any) => v.name === varName);
    if (!variable) {
      console.error(`Variable "${varName}" not found in contract`);
      console.log('\nAvailable variables:');
      for (const v of contractData.variables || []) {
        console.log(`  - ${v.name} (${v.type}${v.required ? ', required' : ''})`);
      }
      process.exit(1);
    }

    // Explain the variable
    this.explainVariable(variable);
  }

  private explainVariable(v: any): void {
    console.log(`\nVariable: ${v.name}`);
    console.log('─'.repeat(50));

    console.log(`\nType: ${v.type}`);

    if (v.description) {
      console.log(`Description: ${v.description}`);
    }

    console.log(`Required: ${v.required ? 'Yes' : 'No'}`);

    if (v.defaultValue !== undefined && v.defaultValue !== null) {
      console.log(`Default: ${JSON.stringify(v.defaultValue)}`);
    }

    if (v.isSecret) {
      console.log('Security: ⚠️  SECRET - Handle with care');
    }

    // Type-specific info
    if (v.type === 'enum' && v.values) {
      console.log(`Allowed values: ${v.values.join(', ')}`);
    }

    if (v.type === 'int' || v.type === 'number') {
      console.log('Numeric constraints:');
      if (v.minimum !== undefined) console.log(`  Min: ${v.minimum}`);
      if (v.maximum !== undefined) console.log(`  Max: ${v.maximum}`);
    }

    if (v.type === 'string') {
      console.log('String constraints:');
      if (v.minLength !== undefined) console.log(`  Min length: ${v.minLength}`);
      if (v.maxLength !== undefined) console.log(`  Max length: ${v.maxLength}`);
      if (v.pattern) console.log(`  Pattern: ${v.pattern}`);
    }

    if (v.policy) {
      console.log('\nPolicy:');
      if (v.policy.readonly) console.log('  Readonly: Yes');
      if (v.policy.visibility) console.log(`  Visibility: ${v.policy.visibility}`);
    }

    // Examples
    this.showExamples(v);

    console.log();
  }

  private showExamples(v: any): void {
    const examples: Record<string, string[]> = {
      url: [
        'http://example.com',
        'https://api.service.com/path',
        'postgres://user:pass@localhost/db',
      ],
      int: ['0', '3000', '100'],
      number: ['3.14', '0.5', '1000'],
      boolean: ['true', 'false', 'yes', 'no', '1', '0'],
      string: ['value1', 'value2', 'any-string'],
      json: ['{"key":"value"}', '["item1","item2"]', '{}'],
      secret: ['(keep this secret)', '(use strong values)'],
    };

    if (v.type === 'enum') {
      examples.enum = v.values || [];
    }

    const typeExamples = examples[v.type] || examples.string;
    console.log('\nExample values:');
    for (const ex of typeExamples) {
      console.log(`  ${v.name}=${ex}`);
    }
  }

  private getOptionValue(args: string[], option: string, defaultValue: string): string {
    const index = args.indexOf(option);
    if (index === -1) return defaultValue;
    if (index + 1 < args.length) return args[index + 1];
    return defaultValue;
  }
}
