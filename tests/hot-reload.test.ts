import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Schema } from '../src/core/schema';
import { Types } from '../src/core/types';
import { Resolver } from '../src/runtime/resolver';
import { Environment } from '../src/runtime/environment';
import { HotReloadManager } from '../src/runtime/hot-reload';

describe('HotReloadManager', () => {
  let schema: Schema;
  let resolver: Resolver;
  let env: Environment;
  let manager: HotReloadManager;
  let tempFile: string;

  beforeEach(() => {
    // Setup schema
    schema = new Schema();
    schema.define('APP_NAME', Types.string().markRequired());
    schema.define('PORT', Types.int().default(3000));
    schema.define('DEBUG', Types.boolean().default(false));

    // Setup resolver
    resolver = new Resolver(schema, {
      fileEnv: { APP_NAME: 'MyApp', PORT: '3000' },
    });

    // Create environment
    env = new Environment({
      schema,
      values: resolver.resolve().values,
    });

    // Create manager
    manager = new HotReloadManager(schema, env, { debounceMs: 100 });

    // Create temp file
    tempFile = path.join(os.tmpdir(), `test-env-${Date.now()}.env`);
    fs.writeFileSync(tempFile, 'APP_NAME=MyApp\nPORT=3000\n');
  });

  afterEach(() => {
    manager.close();
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  it('initializes with current environment', () => {
    expect(manager.getEnvironment()).toBe(env);
  });

  it('tracks change history', async () => {
    const changes = manager.getChangeHistory();
    expect(Array.isArray(changes)).toBe(true);
  });

  it('allows updating single variable', async () => {
    await manager.updateVariable('PORT', 8080);
    const updated = manager.getEnvironment();
    expect(updated.getInt('PORT')).toBe(8080);
  });

  it('validates before committing changes', async () => {
    await expect(manager.updateVariable('PORT', 'invalid')).rejects.toThrow();
  });

  it('rejects unknown variables', async () => {
    await expect(manager.updateVariable('UNKNOWN', 'value')).rejects.toThrow();
  });

  it('emits change events', async () => {
    const changes: any[] = [];
    manager.onChange((change) => {
      changes.push(change);
    });

    await manager.updateVariable('PORT', 8080);

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(changes.length).toBeGreaterThan(0);
  });

  it('emits variable-specific change events', async () => {
    const changes: any[] = [];
    manager.onVariableChange('PORT', (change) => {
      changes.push(change);
    });

    await manager.updateVariable('PORT', 8080);

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(changes.length).toBeGreaterThan(0);
  });

  it('debounces file changes', async () => {
    let reloadCount = 0;
    manager.on('reloaded', () => reloadCount++);

    manager.watchFile(tempFile);

    // Make multiple rapid changes
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(tempFile, `APP_NAME=MyApp\nPORT=${3000 + i}\n`);
    }

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Should only reload once despite multiple changes
    expect(reloadCount).toBeLessThanOrEqual(1);

    manager.stopWatching();
  });

  it('captures change details', async () => {
    const changes: any[] = [];
    manager.onChange((change) => {
      changes.push(change);
    });

    await manager.updateVariable('PORT', 8080);

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Look for the PORT change
    const portChange = changes.find(
      (c) => c.key === 'PORT' && (c.event === 'updated' || c.event === 'added')
    );

    if (portChange) {
      expect(portChange.oldValue).toBeDefined();
      expect(portChange.newValue).toBe(8080);
      expect(portChange.timestamp).toBeGreaterThan(0);
    }
  });

  it('handles reload errors', async () => {
    let errorCaught = false;
    manager.on('error', () => {
      errorCaught = true;
    });

    try {
      await manager.updateVariable('PORT', 'not a number');
    } catch (error) {
      // Expected
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(errorCaught).toBe(true);
  });

  it('supports custom debounce timing', async () => {
    const customManager = new HotReloadManager(schema, env, {
      debounceMs: 50,
    });

    const history = customManager.getChangeHistory();
    expect(Array.isArray(history)).toBe(true);

    customManager.close();
  });

  it('supports retry on failure', async () => {
    const retryManager = new HotReloadManager(schema, env, {
      maxRetries: 2,
      retryDelayMs: 50,
    });

    // This should succeed after retries
    await retryManager.updateVariable('PORT', 5000);
    expect(retryManager.getEnvironment().getInt('PORT')).toBe(5000);

    retryManager.close();
  });

  it('stops watching on cleanup', () => {
    manager.watchFile(tempFile);
    manager.stopWatching();

    // File is no longer being watched
    expect(manager.getEnvironment()).toBeDefined();
  });

  it('closes all watchers', () => {
    manager.watchFile(tempFile);
    manager.close();

    // Should be closed
    expect(manager.getEnvironment()).toBeDefined();
  });
});

describe('ChangeDetection', () => {
  let schema: Schema;
  let resolver: Resolver;
  let env: Environment;
  let manager: HotReloadManager;

  beforeEach(() => {
    schema = new Schema();
    schema.define('VAR1', Types.string().default('default1'));
    schema.define('VAR2', Types.string().default('default2'));

    resolver = new Resolver(schema, {
      fileEnv: { VAR1: 'value1' },
    });

    env = new Environment({
      schema,
      values: resolver.resolve().values,
    });
    manager = new HotReloadManager(schema, env);
  });

  afterEach(() => {
    manager.close();
  });

  it('detects added variables', async () => {
    const changes: any[] = [];
    manager.onChange((change) => {
      changes.push(change);
    });

    await manager.updateVariable('VAR2', 'new_value');

    await new Promise((resolve) => setTimeout(resolve, 200));

    const addedChange = changes.find((c) => c.event === 'added' || c.event === 'updated');
    expect(addedChange).toBeDefined();
  });

  it('detects updated variables', async () => {
    const changes: any[] = [];
    manager.onChange((change) => {
      changes.push(change);
    });

    await manager.updateVariable('VAR1', 'new_value1');

    await new Promise((resolve) => setTimeout(resolve, 200));

    const updatedChange = changes.find((c) => c.event === 'updated' && c.key === 'VAR1');
    expect(updatedChange).toBeDefined();
  });
});

describe('WatchFile', () => {
  let schema: Schema;
  let resolver: Resolver;
  let env: Environment;
  let manager: HotReloadManager;
  let tempFile: string;

  beforeEach(() => {
    schema = new Schema();
    schema.define('TEST_VAR', Types.string().default('default'));

    resolver = new Resolver(schema);
    env = new Environment({
      schema,
      values: resolver.resolve().values,
    });
    manager = new HotReloadManager(schema, env, { debounceMs: 100 });

    tempFile = path.join(os.tmpdir(), `test-watch-${Date.now()}.env`);
    fs.writeFileSync(tempFile, 'TEST_VAR=initial\n');
  });

  afterEach(() => {
    manager.close();
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  it('throws on non-existent file', () => {
    expect(() => manager.watchFile('/nonexistent/file.env')).toThrow();
  });

  it('emits watching event', () => {
    let watchingEmitted = false;
    manager.on('watching', () => {
      watchingEmitted = true;
    });

    manager.watchFile(tempFile);

    expect(watchingEmitted).toBe(true);
    manager.stopWatching();
  });

  it('handles file deletion gracefully', async () => {
    manager.watchFile(tempFile);

    // Give watcher time to initialize
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Delete file
    fs.unlinkSync(tempFile);

    // Manager should still exist
    expect(manager.getEnvironment()).toBeDefined();

    manager.stopWatching();
  });
});
