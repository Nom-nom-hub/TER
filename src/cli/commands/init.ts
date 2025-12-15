/**
 * Init command - Create a new contract
 */

import * as fs from 'fs';
import { Schema } from '../../core/schema';
import { Types } from '../../core/types';

export class InitCommand {
  async run(args: string[]): Promise<void> {
    const contractPath = this.getOptionValue(args, '--contract', '.ter.json');

    if (fs.existsSync(contractPath)) {
      console.error(`Contract file already exists: ${contractPath}`);
      process.exit(1);
    }

    // Create a basic contract
    const schema = new Schema();
    const url = Types.url();
    url.markRequired();
    schema.define('DATABASE_URL', url);
    schema.define('PORT', Types.int().default(3000));
    schema.define('NODE_ENV', Types.enum(['development', 'production']).default('development'));
    const secret = Types.secret();
    secret.markRequired();
    schema.define('API_KEY', secret);

    const contractData = schema.toJSON();
    fs.writeFileSync(contractPath, JSON.stringify(contractData, null, 2));

    console.log(`Created contract file: ${contractPath}`);
    console.log('Update it to match your configuration needs.');
    console.log('Then run: ter check');
  }

  private getOptionValue(args: string[], option: string, defaultValue: string): string {
    const index = args.indexOf(option);
    if (index === -1) return defaultValue;
    if (index + 1 < args.length) return args[index + 1];
    return defaultValue;
  }
}
