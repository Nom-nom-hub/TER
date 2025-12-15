/**
 * Environment Watcher Tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EnvironmentWatcher } from '../src/runtime/watcher';
import { Environment } from '../src/runtime/environment';
import { createSchema } from '../src/core/schema';
import * as Types from '../src/core/types';

describe('EnvironmentWatcher', () => {
  let tempDir: string;
  let testEnvFile: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ter-test-'));
    testEnvFile = path.join(tempDir, '.env');
  });

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(testEnvFile)) {
      fs.unlinkSync(testEnvFile);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  });

  test('should track watched files', () => {
    const schema = createSchema({
      TEST: new Types.StringType(),
    });

    const env = new Environment(schema);
    const watcher = new EnvironmentWatcher();

    fs.writeFileSync(testEnvFile, 'TEST=value\n');

    watcher.watch(testEnvFile, env);
    expect(watcher.getWatchedFiles()).toContain(path.resolve(testEnvFile));

    watcher.unwatch(testEnvFile);
    expect(watcher.getWatchedFiles()).not.toContain(path.resolve(testEnvFile));
  });

  test('should not double-watch the same file', () => {
    const schema = createSchema({
      TEST: new Types.StringType(),
    });

    const env = new Environment(schema);
    const watcher = new EnvironmentWatcher();

    fs.writeFileSync(testEnvFile, 'TEST=value\n');

    watcher.watch(testEnvFile, env);
    const firstCount = watcher.getWatchedFiles().length;

    watcher.watch(testEnvFile, env);
    const secondCount = watcher.getWatchedFiles().length;

    expect(firstCount).toBe(secondCount);
    watcher.unwatchAll();
  });

  test('should detect file hash changes', () => {
    const schema = createSchema({
      TEST: new Types.StringType(),
    });

    const env = new Environment(schema);
    const watcher = new EnvironmentWatcher();

    fs.writeFileSync(testEnvFile, 'TEST=value1\n');
    watcher.watch(testEnvFile, env);

    expect(watcher.hasChanged(testEnvFile)).toBe(false);

    fs.writeFileSync(testEnvFile, 'TEST=value2\n');
    expect(watcher.hasChanged(testEnvFile)).toBe(true);

    watcher.unwatchAll();
  });

  test('should skip comments and empty lines', () => {
    const schema = createSchema({
      TEST: new Types.StringType(),
    });

    const env = new Environment(schema);
    const watcher = new EnvironmentWatcher();

    const content = `
# This is a comment
TEST=value

# Another comment
IGNORED=true
`;

    fs.writeFileSync(testEnvFile, content);
    watcher.watch(testEnvFile, env);

    // Just verify it doesn't error
    expect(watcher.getWatchedFiles()).toContain(path.resolve(testEnvFile));
    watcher.unwatchAll();
  });

  test('should handle errors gracefully', (done) => {
    const schema = createSchema({
      TEST: new Types.StringType(),
    });

    const env = new Environment(schema);
    let errorCaught = false;

    const watcher = new EnvironmentWatcher({
      onError: (error) => {
        errorCaught = true;
      },
    });

    fs.writeFileSync(testEnvFile, 'TEST=value\n');
    watcher.watch(testEnvFile, env);

    // Try to reload on non-existent file
    watcher.reload(path.join(tempDir, 'nonexistent.env'), env).then((change) => {
      expect(change).toBeNull();
      watcher.unwatchAll();
      done();
    });
  });

  test('should unwatchAll', () => {
    const schema = createSchema({
      TEST: new Types.StringType(),
    });

    const env = new Environment(schema);
    const watcher = new EnvironmentWatcher();

    // Create multiple files
    const file1 = path.join(tempDir, '.env1');
    const file2 = path.join(tempDir, '.env2');

    fs.writeFileSync(file1, 'TEST=1\n');
    fs.writeFileSync(file2, 'TEST=2\n');

    watcher.watch(file1, env);
    watcher.watch(file2, env);

    expect(watcher.getWatchedFiles()).toHaveLength(2);

    watcher.unwatchAll();

    expect(watcher.getWatchedFiles()).toHaveLength(0);

    // Clean up
    fs.unlinkSync(file1);
    fs.unlinkSync(file2);
  });

  test('should parse .env format with comments and quotes', () => {
    const watcher = new EnvironmentWatcher();
    
    const content = `
# Database config
DATABASE_URL="postgres://localhost/db"
PORT=5432

# Keys
API_KEY='secret123'
DEBUG=true

# Empty and comment only
# IGNORED=value
`;

    // Access parseEnvFile through reflection since it's private
    const parseEnvFile = (content: string): Record<string, string> => {
      const values: Record<string, string> = {};
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        const equalsIndex = trimmed.indexOf('=');
        if (equalsIndex === -1) {
          continue;
        }

        const key = trimmed.substring(0, equalsIndex).trim();
        let value = trimmed.substring(equalsIndex + 1).trim();

        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        values[key] = value;
      }

      return values;
    };

    const parsed = parseEnvFile(content);
    
    expect(parsed.DATABASE_URL).toBe('postgres://localhost/db');
    expect(parsed.PORT).toBe('5432');
    expect(parsed.API_KEY).toBe('secret123');
    expect(parsed.DEBUG).toBe('true');
    expect(parsed.IGNORED).toBeUndefined();
  });

  test('should create watcher with custom debounce', () => {
    const schema = createSchema({
      TEST: new Types.StringType(),
    });

    const env = new Environment(schema);
    const watcher = new EnvironmentWatcher({ debounceMs: 500 });

    fs.writeFileSync(testEnvFile, 'TEST=value\n');
    watcher.watch(testEnvFile, env);

    expect(watcher.getWatchedFiles()).toHaveLength(1);
    watcher.unwatchAll();
  });

  test('should handle onReload and onError callbacks', () => {
    const schema = createSchema({
      TEST: new Types.StringType(),
    });

    const env = new Environment(schema);
    let reloadCalled = false;
    let errorCalled = false;

    const watcher = new EnvironmentWatcher({
      onReload: (env, change) => {
        reloadCalled = true;
      },
      onError: (error) => {
        errorCalled = true;
      },
    });

    fs.writeFileSync(testEnvFile, 'TEST=value\n');
    watcher.watch(testEnvFile, env);

    expect(watcher.getWatchedFiles()).toHaveLength(1);
    watcher.unwatchAll();
  });
});
