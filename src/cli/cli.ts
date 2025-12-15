/**
 * CLI Entry Point
 */

import { CheckCommand } from './commands/check';
import { ExplainCommand } from './commands/explain';
import { DiffCommand } from './commands/diff';
import { GraphCommand } from './commands/graph';
import { RunCommand } from './commands/run';
import { schema } from './commands/schema';
import { InitCommand } from './commands/init';
import { WatchCommand } from './commands/watch';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'check':
        await new CheckCommand().run(args.slice(1));
        break;
      case 'explain':
        await new ExplainCommand().run(args.slice(1));
        break;
      case 'diff':
        await new DiffCommand().run(args.slice(1));
        break;
      case 'graph':
        await new GraphCommand().run(args.slice(1));
        break;
      case 'run':
        await new RunCommand().run(args.slice(1));
        break;
      case 'init':
        await new InitCommand().run(args.slice(1));
        break;
      case 'schema':
        parseAndRunSchema(args.slice(1));
        break;
      case 'watch':
        await new WatchCommand().run(args.slice(1));
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
TER - Typed Environment Runtime

Usage:
  ter <command> [options]

Commands:
  check <file>       Validate environment against contract
  explain <VAR>      Show details about a variable
  diff <e1> <e2>     Compare two environment files
  graph              Visualize environment hierarchy
  run -- <cmd>       Execute command with validated environment
  init               Initialize a new contract
  schema             Export contract as JSON Schema Draft 7
  watch              Monitor environment file for changes
  help               Show this help message

Options:
  -h, --help         Show help
  --contract <path>  Path to contract file (default: .ter.json)
  --env <path>       Path to .env file
  --output <path>    Output path (for schema command)

Examples:
  ter check
  ter check --contract .ter.json --env .env
  ter explain DATABASE_URL
  ter init
  ter schema --contract .ter.json --output schema.json
  ter watch --contract .ter.json --env .env
  `);
}

function parseAndRunSchema(args: string[]) {
  const options: any = { pretty: true };
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--contract' || args[i] === '-c') && i + 1 < args.length) {
      options.contract = args[++i];
    } else if ((args[i] === '--output' || args[i] === '-o') && i + 1 < args.length) {
      options.output = args[++i];
    }
  }
  schema(options);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
