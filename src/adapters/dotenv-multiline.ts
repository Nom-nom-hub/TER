/**
 * DotEnv Multiline Value Support
 *
 * Handles multiline values in .env files:
 * - Line continuation with backslash: value \
 *   continues on next line
 * - Heredoc syntax: <<EOF
 *   multiline content
 *   EOF
 * - JSON multiline (implicit with quotes)
 * - Proper escape sequence handling
 */

export interface MultilineOptions {
  /**
   * Allow line continuation with backslash
   */
  allowLineContination?: boolean;

  /**
   * Allow heredoc syntax (<<EOF ... EOF)
   */
  allowHeredoc?: boolean;

  /**
   * Maximum multiline value size (bytes, 0 = unlimited)
   */
  maxSize?: number;

  /**
   * Preserve indentation in multiline values
   */
  preserveIndentation?: boolean;
}

/**
 * Parse .env file with multiline value support
 */
export function parseDotEnvWithMultiline(
  content: string,
  options: MultilineOptions = {}
): Record<string, string> {
  const opts: Required<MultilineOptions> = {
    allowLineContination: options.allowLineContination ?? true,
    allowHeredoc: options.allowHeredoc ?? true,
    maxSize: options.maxSize ?? 1048576, // 1MB default
    preserveIndentation: options.preserveIndentation ?? false,
  };

  const result: Record<string, string> = {};
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip comments and empty lines
    if (!line.trim() || line.trim().startsWith('#')) {
      i++;
      continue;
    }

    // Try to parse key=value
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      i++;
      continue;
    }

    const key = match[1];
    let value = match[2];

    // Check for heredoc syntax
    if (opts.allowHeredoc && value.trim().startsWith('<<')) {
      const heredocMatch = value.trim().match(/^<<(\w+)\s*$/);
      if (heredocMatch) {
        const delimiter = heredocMatch[1];
        i++;
        const heredocLines: string[] = [];

        while (i < lines.length) {
          const heredocLine = lines[i];
          if (heredocLine.trim() === delimiter) {
            break;
          }
          heredocLines.push(heredocLine);
          i++;
        }

        value = heredocLines.join('\n');

        if (!opts.preserveIndentation) {
          // Remove common indentation
          value = removeCommonIndentation(value);
        }

        result[key] = value;
        i++;
        continue;
      }
    }

    // Handle line continuation
    if (opts.allowLineContination && value.endsWith('\\')) {
      const continuedLines: string[] = [value.slice(0, -1)]; // Remove trailing backslash
      i++;

      while (i < lines.length && opts.allowLineContination) {
        const nextLine = lines[i];

        // Stop at comments or key=value lines
        if (!nextLine.trim() || nextLine.trim().startsWith('#')) {
          break;
        }

        if (nextLine.match(/^[A-Za-z_][A-Za-z0-9_]*\s*=/)) {
          break;
        }

        // Handle quoted continuation
        if (nextLine.match(/^['"][^'"]*['"]$/)) {
          continuedLines.push(nextLine);
          i++;
          if (!nextLine.endsWith('\\')) {
            break;
          }
          continuedLines[continuedLines.length - 1] = continuedLines[continuedLines.length - 1].slice(0, -1);
        } else if (nextLine.endsWith('\\')) {
          continuedLines.push(nextLine.slice(0, -1));
          i++;
        } else {
          continuedLines.push(nextLine);
          i++;
          break;
        }
      }

      value = continuedLines.join('\n');
    }

    // Handle quoted values (including multiline quotes)
    if ((value.startsWith('"') && value.includes('"', 1)) ||
        (value.startsWith("'") && value.includes("'", 1))) {
      const quote = value[0];
      let closeIndex = value.indexOf(quote, 1);

      // Handle escaped quotes
      while (closeIndex > 0 && value[closeIndex - 1] === '\\') {
        closeIndex = value.indexOf(quote, closeIndex + 1);
      }

      if (closeIndex > 0) {
        value = value.slice(1, closeIndex);
        // Unescape common sequences
        value = unescapeString(value, quote === '"');
      }
    }

    // Check size limit
    if (opts.maxSize > 0 && value.length > opts.maxSize) {
      throw new Error(
        `Value for key '${key}' exceeds maximum size of ${opts.maxSize} bytes`
      );
    }

    result[key] = value;
    i++;
  }

  return result;
}

/**
 * Generate .env file with multiline value support
 */
export function generateDotEnvWithMultiline(
  values: Record<string, string>,
  options: { useHeredoc?: boolean; maxLineLength?: number } = {}
): string {
  const useHeredoc = options.useHeredoc ?? true;
  const maxLineLength = options.maxLineLength ?? 80;
  const lines: string[] = [];

  for (const [key, value] of Object.entries(values)) {
    if (!isValidKey(key)) {
      throw new Error(`Invalid key: ${key}`);
    }

    // Determine how to format the value
    if (value.includes('\n')) {
      // Multiline value
      if (useHeredoc && !value.includes('<<EOF') && !value.includes('\n\n')) {
        // Use heredoc for cleaner multiline
        lines.push(`${key}=<<EOF`);
        lines.push(value);
        lines.push('EOF');
      } else {
        // Use line continuation
        const parts = value.split('\n');
        lines.push(`${key}=${escapeValue(parts[0])}`);
        for (let i = 1; i < parts.length; i++) {
          const part = escapeValue(parts[i]);
          if (i < parts.length - 1) {
            lines.push(part + ' \\');
          } else {
            lines.push(part);
          }
        }
      }
    } else if (value.length > maxLineLength || needsQuoting(value)) {
      // Single-line but needs quoting or is long
      lines.push(`${key}="${escapeValue(value)}"`);
    } else {
      // Simple value
      lines.push(`${key}=${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Merge multiple .env files with multiline support
 */
export function mergeDotEnvFiles(
  ...contents: string[]
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const content of contents) {
    const parsed = parseDotEnvWithMultiline(content);
    Object.assign(result, parsed);
  }

  return result;
}

/**
 * Compare two .env files (multiline-aware)
 */
export interface DotEnvDiff {
  added: Record<string, string>;
  removed: Record<string, string>;
  modified: Record<string, { old: string; new: string }>;
  unchanged: Record<string, string>;
}

export function diffDotEnvFiles(
  oldContent: string,
  newContent: string
): DotEnvDiff {
  const oldParsed = parseDotEnvWithMultiline(oldContent);
  const newParsed = parseDotEnvWithMultiline(newContent);

  const added: Record<string, string> = {};
  const removed: Record<string, string> = {};
  const modified: Record<string, { old: string; new: string }> = {};
  const unchanged: Record<string, string> = {};

  // Find added and modified
  for (const [key, newValue] of Object.entries(newParsed)) {
    if (!(key in oldParsed)) {
      added[key] = newValue;
    } else if (oldParsed[key] !== newValue) {
      modified[key] = {
        old: oldParsed[key],
        new: newValue,
      };
    } else {
      unchanged[key] = newValue;
    }
  }

  // Find removed
  for (const [key, oldValue] of Object.entries(oldParsed)) {
    if (!(key in newParsed)) {
      removed[key] = oldValue;
    }
  }

  return { added, removed, modified, unchanged };
}

// Private helpers

function removeCommonIndentation(value: string): string {
  const lines = value.split('\n');
  if (lines.length <= 1) return value;

  // Find minimum indentation (ignoring empty lines)
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim()) {
      const indent = line.match(/^\s*/)?.[0].length || 0;
      minIndent = Math.min(minIndent, indent);
    }
  }

  if (minIndent === Infinity || minIndent === 0) {
    return value;
  }

  // Remove common indentation
  return lines
    .map((line) => (line.trim() ? line.slice(minIndent) : line))
    .join('\n');
}

function unescapeString(value: string, isDoubleQuoted: boolean): string {
  if (isDoubleQuoted) {
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  // Single quotes: only unescape single quote itself
  return value.replace(/\\'/g, "'");
}

function escapeValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/"/g, '\\"');
}

function needsQuoting(value: string): boolean {
  // Needs quoting if it contains special characters or spaces
  return /[=\s#"'\\]/.test(value);
}

function isValidKey(key: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
}

export default parseDotEnvWithMultiline;
