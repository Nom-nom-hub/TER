/**
 * CLI: Export JSON Schema
 * Exports TER contract as JSON Schema Draft 7
 */

import * as fs from 'fs';
import * as path from 'path';
import { Schema } from '../../core/schema';
import { exportAsJSONSchema, schemaToJSONSchema } from '../../core/json-schema';
import { reconstructSchemaFromJSON } from '../../core/schema-json';

export interface SchemaCommandOptions {
  contract?: string;
  output?: string;
  pretty?: boolean;
}

/**
 * Export contract as JSON Schema
 */
export function schema(options: SchemaCommandOptions): void {
  try {
    const contractPath = options.contract || '.ter.json';

    // Check if contract file exists
    if (!fs.existsSync(contractPath)) {
      console.error(`✗ Contract file not found: ${contractPath}`);
      process.exit(1);
    }

    // Read and parse contract
    const contractContent = fs.readFileSync(contractPath, 'utf-8');
    let contractJSON: any;

    try {
      contractJSON = JSON.parse(contractContent);
    } catch (e) {
      console.error(`✗ Invalid JSON in contract file: ${e}`);
      process.exit(1);
    }

    // Reconstruct schema from contract
    const terSchema = reconstructSchemaFromJSON(contractJSON);

    // Generate JSON Schema
    const jsonSchema = schemaToJSONSchema(terSchema, `${path.basename(contractPath, '.json')} Configuration`);

    const output = JSON.stringify(jsonSchema, null, 2);

    // Output or save
    if (options.output) {
      fs.writeFileSync(options.output, output, 'utf-8');
      console.log(`✓ JSON Schema exported to: ${options.output}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    console.error(`✗ Error exporting schema: ${error}`);
    process.exit(1);
  }
}
