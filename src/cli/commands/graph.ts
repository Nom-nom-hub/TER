/**
 * Graph command - Show environment hierarchy
 */

import * as fs from 'fs';
import { createGraph } from '../../core/inheritance';
import { Schema } from '../../core/schema';
import { Types } from '../../core/types';

export interface GraphConfig {
  version: string;
  environments: Array<{
    name: string;
    extends?: string;
    path?: string;
    values?: Record<string, string>;
  }>;
}

export class GraphCommand {
  async run(args: string[]): Promise<void> {
    const graphPath = this.getOptionValue(args, '--graph', '.ter-graph.json');

    if (!fs.existsSync(graphPath)) {
      console.error(`Graph file not found: ${graphPath}`);
      console.error('\nCreate a .ter-graph.json file with this structure:\n');
      this.showExample();
      process.exit(1);
    }

    const content = fs.readFileSync(graphPath, 'utf-8');
    let graphConfig: GraphConfig;

    try {
      graphConfig = JSON.parse(content);
    } catch (err) {
      console.error(`Failed to parse graph file: ${err}`);
      process.exit(1);
    }

    // Create graph
    const schema = new Schema();
    const graph = createGraph(schema);

    // Load environments
    for (const env of graphConfig.environments) {
      const values = env.values || {};

      // Load from file if path is specified
      if (env.path && fs.existsSync(env.path)) {
        const fileContent = fs.readFileSync(env.path, 'utf-8');
        const fileVals = this.parseDotEnv(fileContent);
        Object.assign(values, fileVals);
      }

      graph.define(env.name, {
        values,
        extends: env.extends,
        path: env.path,
      });
    }

    // Display graph
    this.displayGraph(graph);
  }

  private displayGraph(graph: any): void {
    const envs = graph.all();

    // Build tree
    const roots: any[] = [];
    const byName: Record<string, any> = {};

    for (const env of envs) {
      byName[env.name] = { ...env, children: [] };
      if (!env.extends) {
        roots.push(byName[env.name]);
      }
    }

    // Link children to parents
    for (const env of envs) {
      if (env.extends && byName[env.extends]) {
        byName[env.extends].children.push(byName[env.name]);
      }
    }

    console.log('\nEnvironment Graph:\n');

    for (const root of roots) {
      this.printTree(root, '', true);
    }

    // Show summary
    console.log(`\nTotal environments: ${envs.length}`);

    // Show diffs between adjacent environments
    const pairs = this.findAdjacentPairs(envs);
    if (pairs.length > 0) {
      console.log('\nKey Differences:');
      for (const [env1, env2] of pairs) {
        const diff = graph.diff(env1.name, env2.name);
        if (
          Object.keys(diff.added).length +
            Object.keys(diff.removed).length +
            Object.keys(diff.modified).length >
          0
        ) {
          console.log(`\n  ${env1.name} -> ${env2.name}:`);
          if (Object.keys(diff.modified).length > 0) {
            console.log(`    Modified: ${Object.keys(diff.modified).join(', ')}`);
          }
          if (Object.keys(diff.added).length > 0) {
            console.log(`    Added: ${Object.keys(diff.added).join(', ')}`);
          }
          if (Object.keys(diff.removed).length > 0) {
            console.log(`    Removed: ${Object.keys(diff.removed).join(', ')}`);
          }
        }
      }
    }
  }

  private printTree(
    node: any,
    prefix: string,
    isLast: boolean,
    skipFirst = false
  ): void {
    if (!skipFirst) {
      const connector = isLast ? '└─ ' : '├─ ';
      console.log(prefix + connector + node.name);
      prefix += isLast ? '   ' : '│  ';
    }

    for (let i = 0; i < node.children.length; i++) {
      const isLastChild = i === node.children.length - 1;
      this.printTree(node.children[i], prefix, isLastChild);
    }
  }

  private findAdjacentPairs(envs: any[]): Array<[any, any]> {
    const pairs: Array<[any, any]> = [];

    // Find leaf nodes and their immediate parent
    for (const env of envs) {
      if (env.children && env.children.length > 0) {
        for (const child of env.children) {
          pairs.push([env, child]);
        }
      }
    }

    return pairs;
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

  showExample(): void {
    console.log(`{
  "version": "1.0",
  "environments": [
    {
      "name": "base",
      "values": {
        "DATABASE_URL": "postgres://localhost/db",
        "PORT": "3000",
        "LOG_LEVEL": "info"
      }
    },
    {
      "name": "local",
      "extends": "base",
      "path": ".env.local"
    },
    {
      "name": "staging",
      "extends": "base",
      "path": ".env.staging"
    },
    {
      "name": "production",
      "extends": "base",
      "path": ".env.production"
    }
  ]
}`);
  }
}
