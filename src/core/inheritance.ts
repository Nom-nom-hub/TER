/**
 * Environment Inheritance & Composition
 * Enables environment hierarchies like: base -> local, staging, prod
 */

import { Schema } from './schema';

export interface EnvironmentDef {
  name: string;
  path?: string;
  values: Record<string, string>;
  extends?: string;
}

export class EnvironmentGraph {
  private environments = new Map<string, EnvironmentDef>();
  private schema: Schema;

  constructor(schema: Schema) {
    this.schema = schema;
  }

  /**
   * Add an environment definition
   */
  define(name: string, env: Omit<EnvironmentDef, 'name'>): this {
    this.environments.set(name, { name, ...env });
    return this;
  }

  /**
   * Get an environment by name
   */
  get(name: string): EnvironmentDef | undefined {
    return this.environments.get(name);
  }

  /**
   * Resolve an environment with inheritance
   */
  resolve(name: string): Record<string, string> {
    const resolved: Record<string, string> = {};
    const visited = new Set<string>();

    const resolveImpl = (envName: string) => {
      if (visited.has(envName)) {
        throw new Error(`Circular dependency detected in environment "${envName}"`);
      }

      const env = this.environments.get(envName);
      if (!env) {
        throw new Error(`Environment "${envName}" not found`);
      }

      visited.add(envName);

      // First resolve parent if any
      if (env.extends) {
        const parentVals = resolveImpl(env.extends);
        Object.assign(resolved, parentVals);
      }

      // Then overlay this environment's values
      Object.assign(resolved, env.values);

      return resolved;
    };

    return resolveImpl(name);
  }

  /**
   * Get all environments
   */
  all(): EnvironmentDef[] {
    return Array.from(this.environments.values());
  }

  /**
   * Diff two environments
   */
  diff(name1: string, name2: string): {
    added: Record<string, string>;
    removed: Record<string, string>;
    modified: Record<string, [string, string]>;
  } {
    const env1 = this.resolve(name1);
    const env2 = this.resolve(name2);

    const added: Record<string, string> = {};
    const removed: Record<string, string> = {};
    const modified: Record<string, [string, string]> = {};

    // Find added and modified
    for (const [key, val2] of Object.entries(env2)) {
      if (!(key in env1)) {
        added[key] = val2;
      } else if (env1[key] !== val2) {
        modified[key] = [env1[key], val2];
      }
    }

    // Find removed
    for (const [key, val1] of Object.entries(env1)) {
      if (!(key in env2)) {
        removed[key] = val1;
      }
    }

    return { added, removed, modified };
  }

  /**
   * Export graph as JSON
   */
  toJSON() {
    return {
      environments: Array.from(this.environments.values()).map((e) => ({
        name: e.name,
        extends: e.extends,
        path: e.path,
        variables: Object.keys(e.values),
      })),
    };
  }
}

/**
 * Helper to create environment graph
 */
export function createGraph(schema: Schema): EnvironmentGraph {
  return new EnvironmentGraph(schema);
}
