/**
 * Typed Environment Runtime (TER)
 * Main library export
 */

export * from './core';
export * from './runtime';
export * from './adapters';
export * from './mcp';

// Convenience API
import { Types, createSchema } from './core';
import { createEnvironment } from './runtime';

export const env = {
  types: Types,
  define: createSchema,
  create: createEnvironment,
};
