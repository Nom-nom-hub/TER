// Dynamic reloading and change handlers for environments

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { Environment } from './environment';
import { Schema } from '../core/schema';

export type ChangeEvent = 'added' | 'updated' | 'removed' | 'validated' | 'error';

export interface EnvironmentChange {
  event: ChangeEvent;
  key?: string;
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: number;
  error?: Error;
}

export interface ReloadOptions {
  debounceMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  validateBeforeCommit?: boolean;
  rollbackOnError?: boolean;
}

/**
 * Hot reload manager for dynamic configuration changes
 */
export class HotReloadManager extends EventEmitter {
  private schema: Schema;
  private currentEnv: Environment;
  private fileWatcher?: fs.FSWatcher;
  private changeHistory: EnvironmentChange[] = [];
  private debounceTimer?: NodeJS.Timeout;
  private debounceMs: number;
  private maxRetries: number;
  private retryDelayMs: number;
  private validateBeforeCommit: boolean;
  private rollbackOnError: boolean;
  private lastSnapshot?: Map<string, unknown>;

  constructor(
    schema: Schema,
    initialEnv: Environment,
    options: ReloadOptions = {}
  ) {
    super();
    this.schema = schema;
    this.currentEnv = initialEnv;
    this.debounceMs = options.debounceMs || 500;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelayMs = options.retryDelayMs || 100;
    this.validateBeforeCommit = options.validateBeforeCommit !== false;
    this.rollbackOnError = options.rollbackOnError !== false;

    // Take initial snapshot
    this.lastSnapshot = this.captureSnapshot();
  }

  /**
   * Watch a file for changes
   */
  watchFile(filePath: string): void {
    const absolutePath = path.resolve(filePath);

    // Check file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    // Stop existing watcher
    this.stopWatching();

    // Start new watcher
    this.fileWatcher = fs.watch(absolutePath, async (eventType) => {
      if (eventType === 'change') {
        this.debounceReload();
      }
    });

    this.emit('watching', { file: absolutePath });
  }

  /**
   * Reload from file (with debouncing)
   */
  private debounceReload(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.reload().catch((error) => {
        this.recordChange({
          event: 'error',
          timestamp: Date.now(),
          error,
        });
        this.emit('error', error);
      });
    }, this.debounceMs);
  }

  /**
   * Perform reload
   */
  async reload(retryCount = 0): Promise<void> {
    try {
      // Validate before applying changes
      if (this.validateBeforeCommit) {
        const validationResult = this.currentEnv.validate();
        if (!validationResult.valid) {
          throw new Error(`Validation failed: ${validationResult.errors.join('; ')}`);
        }
      }

      // Create new environment with fresh resolver
      const newEnv = new Environment(this.schema);
      newEnv.init();

      // Capture changes
      const changes = this.detectChanges(newEnv);

      // Rollback if needed
      if (this.rollbackOnError && changes.some((c) => c.error)) {
        throw new Error('Changes contain errors, rolling back');
      }

      // Apply changes
      this.currentEnv = newEnv;
      changes.forEach((change) => this.recordChange(change));

      this.emit('reloaded', { changes });
    } catch (error) {
      if (retryCount < this.maxRetries) {
        await this.delay(this.retryDelayMs);
        return this.reload(retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Update a single variable
   */
  async updateVariable(key: string, value: unknown): Promise<void> {
    const variable = this.schema.getVariable(key);
    if (!variable) {
      throw new Error(`Variable '${key}' not found in schema`);
    }

    // Validate new value
    const result = variable.type.validate(String(value));
    if (!result.valid) {
      throw new Error(`Validation failed: ${result.error.reason}`);
    }

    // Reload
    await this.reload();
  }

  /**
   * Rollback to previous state
   */
  rollback(): void {
    if (this.lastSnapshot) {
      const snapshot = this.lastSnapshot;
      const newEnv = new Environment(this.schema);
      newEnv.init();
      this.currentEnv = newEnv;
      this.emit('rolled_back', { snapshot });
    } else {
      throw new Error('No snapshot to rollback to');
    }
  }

  /**
   * Get current environment
   */
  getEnvironment(): Environment {
    return this.currentEnv;
  }

  /**
   * Get change history
   */
  getChangeHistory(limit?: number): EnvironmentChange[] {
    if (limit) {
      return this.changeHistory.slice(-limit);
    }
    return [...this.changeHistory];
  }

  /**
   * Listen for changes to specific variable
   */
  onVariableChange(key: string, callback: (change: EnvironmentChange) => void): void {
    this.on('change', (change: EnvironmentChange) => {
      if (change.key === key) {
        callback(change);
      }
    });
  }

  /**
   * Listen for any changes
   */
  onChange(callback: (change: EnvironmentChange) => void): void {
    this.on('change', callback);
  }

  /**
   * Stop watching
   */
  stopWatching(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = undefined;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  /**
   * Close and cleanup
   */
  close(): void {
    this.stopWatching();
    this.removeAllListeners();
  }

  private captureSnapshot(): Map<string, unknown> {
    const snapshot = new Map<string, unknown>();
    const values = this.currentEnv.getAllValues(false);
    for (const [key, value] of Object.entries(values)) {
      snapshot.set(key, value);
    }
    return snapshot;
  }

  private detectChanges(newEnv: Environment): EnvironmentChange[] {
    const changes: EnvironmentChange[] = [];
    const newValues = newEnv.getAllValues(false);
    const oldValues = this.currentEnv.getAllValues(false);

    // Detect updated and added
    for (const [key, newValue] of Object.entries(newValues)) {
      const oldValue = oldValues[key];
      if (oldValue !== newValue) {
        changes.push({
          event: oldValue === undefined ? 'added' : 'updated',
          key,
          oldValue,
          newValue,
          timestamp: Date.now(),
        });
      }
    }

    // Detect removed
    for (const key of Object.keys(oldValues)) {
      if (newValues[key] === undefined) {
        changes.push({
          event: 'removed',
          key,
          oldValue: oldValues[key],
          timestamp: Date.now(),
        });
      }
    }

    return changes;
  }

  private recordChange(change: EnvironmentChange): void {
    this.changeHistory.push(change);
    this.emit('change', change);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Reload handler for partial reloads
 */
export class PartialReloadHandler {
  constructor(private manager: HotReloadManager) {}

  /**
   * Reload specific variables only
   */
  async reloadVariables(...keys: string[]): Promise<void> {
    for (const key of keys) {
      const value = process.env[key];
      if (value !== undefined) {
        await this.manager.updateVariable(key, value);
      }
    }
  }

}
