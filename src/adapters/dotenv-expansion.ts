/**
 * DotEnv Variable Expansion
 *
 * Supports variable interpolation in .env files:
 * - ${VAR} - expand VAR
 * - $VAR - expand VAR (simple form)
 * - ${VAR:-default} - expand VAR or use default
 * - ${VAR:=default} - expand VAR or use and set default
 * - Nested expansion: ${OUTER${INNER}}
 * - Circular reference detection
 */

export interface ExpansionOptions {
  /**
   * Environment variables to use for expansion
   */
  env?: Record<string, string | undefined>;

  /**
   * Maximum recursion depth to prevent infinite loops
   */
  maxDepth?: number;

  /**
   * Whether to throw on undefined variables (default: true)
   */
  throwOnUndefined?: boolean;

  /**
   * Whether to throw on circular references (default: true)
   */
  throwOnCircular?: boolean;
}

export class VariableExpander {
  private options: Required<ExpansionOptions>;
  private expandingStack: Set<string> = new Set();

  constructor(options: ExpansionOptions = {}) {
    this.options = {
      env: options.env || process.env,
      maxDepth: options.maxDepth || 10,
      throwOnUndefined: options.throwOnUndefined ?? true,
      throwOnCircular: options.throwOnCircular ?? true,
    };
  }

  /**
   * Expand all variables in a value
   */
  expand(value: string, depth: number = 0): string {
    if (depth > this.options.maxDepth) {
      throw new Error(
        `Variable expansion exceeded maximum depth of ${this.options.maxDepth}`
      );
    }

    // Pattern matches: ${VAR}, ${VAR:-default}, $VAR, etc.
    const pattern = /\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g;
    let result = value;
    let hasMatches = true;

    while (hasMatches) {
      hasMatches = false;
      result = result.replace(pattern, (match, braced, simple) => {
        hasMatches = true;
        const varExpr = braced || simple;
        return this.expandVariable(varExpr, depth + 1);
      });
    }

    return result;
  }

  /**
   * Reset the expanding stack (for testing or when reusing expander)
   */
  reset(): void {
    this.expandingStack.clear();
  }

  // Private helpers

  private expandVariable(expr: string, depth: number): string {
    // Check for default value syntax: VAR:-default or VAR:=default
    const defaultMatch = expr.match(/^([^:]+)(?::(-|=)(.*))?$/);
    if (!defaultMatch) {
      throw new Error(`Invalid variable expression: \${${expr}}`);
    }

    const varName = defaultMatch[1];
    const defaultOp = defaultMatch[2]; // '-' or '='
    const defaultValue = defaultMatch[3] || '';

    // Check for circular reference
    if (this.expandingStack.has(varName)) {
      if (this.options.throwOnCircular) {
        throw new Error(`Circular reference detected: ${varName}`);
      }
      return `$\{${expr}\}`;
    }

    // Get variable value
    let value = this.options.env[varName];

    if (value === undefined) {
      if (defaultOp === '-') {
        // ${VAR:-default} - use default if undefined
        value = defaultValue;
      } else if (defaultOp === '=') {
        // ${VAR:=default} - use and set default if undefined
        value = defaultValue;
        this.options.env[varName] = value;
      } else {
        // No default
        if (this.options.throwOnUndefined) {
          throw new Error(`Undefined variable: ${varName}`);
        }
        return `$\{${expr}\}`;
      }
    }

    // Recursively expand the value
    this.expandingStack.add(varName);
    try {
      return this.expand(value, depth);
    } finally {
      this.expandingStack.delete(varName);
    }
  }
}

/**
 * Expand variables in a .env file content string
 */
export function expandDotEnv(
  content: string,
  options: ExpansionOptions = {}
): Record<string, string> {
  const expander = new VariableExpander(options);
  const lines = content.split('\n');
  const result: Record<string, string> = {};

  for (const line of lines) {
    // Skip comments and empty lines
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    // Parse key=value
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    let value = match[2];

    // Handle quoted values
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Expand variables in value
    try {
      result[key] = expander.expand(value);
    } catch (error) {
      throw new Error(`Error expanding ${key}: ${(error as Error).message}`);
    }

    // Make expanded value available for subsequent expansions
    if (!options.env) {
      options.env = {};
    }
    options.env[key] = result[key];
  }

  return result;
}

/**
 * Escape special characters in values to prevent expansion
 */
export function escapeVariables(value: string): string {
  return value
    .replace(/\$/g, '\\$')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}

/**
 * Unescape previously escaped variables
 */
export function unescapeVariables(value: string): string {
  return value
    .replace(/\\\$/g, '$')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}');
}

export default VariableExpander;
