/**
 * Environment Watcher
 * Monitors .env files and reloads on changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { Environment } from './environment';

export interface WatcherOptions {
  debounceMs?: number;
  onReload?: (env: Environment, change: EnvironmentChange) => void;
  onError?: (error: Error) => void;
}

export interface EnvironmentChange {
  type: 'added' | 'removed' | 'modified';
  variables: string[];
  timestamp: Date;
}

/**
 * Watches environment files for changes and reloads them
 */
export class EnvironmentWatcher {
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastHashes: Map<string, string> = new Map();
  private debounceMs: number;
  private onReload?: (env: Environment, change: EnvironmentChange) => void;
  private onError?: (error: Error) => void;

  constructor(options: WatcherOptions = {}) {
    this.debounceMs = options.debounceMs ?? 300;
    this.onReload = options.onReload;
    this.onError = options.onError;
  }

  /**
   * Watch an environment file for changes
   */
  watch(filePath: string, env: Environment): void {
    const absolutePath = path.resolve(filePath);

    if (this.watchers.has(absolutePath)) {
      return; // Already watching
    }

    try {
      // Store initial hash
      if (fs.existsSync(absolutePath)) {
        this.lastHashes.set(absolutePath, this.hashFile(absolutePath));
      }

      const watcher = fs.watch(absolutePath, (eventType) => {
        this.handleFileChange(absolutePath, env);
      });

      this.watchers.set(absolutePath, watcher);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Stop watching a file
   */
  unwatch(filePath: string): void {
    const absolutePath = path.resolve(filePath);
    const watcher = this.watchers.get(absolutePath);

    if (watcher) {
      watcher.close();
      this.watchers.delete(absolutePath);
      this.lastHashes.delete(absolutePath);

      const timer = this.debounceTimers.get(absolutePath);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(absolutePath);
      }
    }
  }

  /**
   * Stop watching all files
   */
  unwatchAll(): void {
    for (const filePath of this.watchers.keys()) {
      this.unwatch(filePath);
    }
  }

  /**
   * Reload environment from file
   */
  async reload(filePath: string, env: Environment): Promise<EnvironmentChange | null> {
    const absolutePath = path.resolve(filePath);

    try {
      if (!fs.existsSync(absolutePath)) {
        return null;
      }

      const content = fs.readFileSync(absolutePath, 'utf-8');
      const oldValues = { ...env.getAllValues() };

      // Parse .env file
      const newValues = this.parseEnvFile(content);

      // Update environment
      const change = this.detectChanges(oldValues, newValues);

      // Reload values in environment
      for (const [key, value] of Object.entries(newValues)) {
        (env as any).injectedValues[key] = value;
      }

      if (this.onReload) {
        this.onReload(env, {
          type: change.type,
          variables: change.variables,
          timestamp: new Date(),
        });
      }

      return {
        type: change.type,
        variables: change.variables,
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  /**
   * Check if any watched files have changed
   */
  hasChanged(filePath: string): boolean {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      return this.lastHashes.has(absolutePath);
    }

    const currentHash = this.hashFile(absolutePath);
    const lastHash = this.lastHashes.get(absolutePath);

    return currentHash !== lastHash;
  }

  /**
   * Get list of watched files
   */
  getWatchedFiles(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * Private: Handle file change event
   */
  private handleFileChange(filePath: string, env: Environment): void {
    // Debounce rapid changes
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.reload(filePath, env).catch((error) => {
        this.handleError(error);
      });
      this.debounceTimers.delete(filePath);
    }, this.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Private: Parse .env file format
   */
  private parseEnvFile(content: string): Record<string, string> {
    const values: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
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
  }

  /**
   * Private: Detect changes between old and new values
   */
  private detectChanges(
    oldValues: Record<string, any>,
    newValues: Record<string, string>,
  ): { type: 'added' | 'removed' | 'modified'; variables: string[] } {
    const variables: string[] = [];
    let type: 'added' | 'removed' | 'modified' = 'modified';

    // Check for added/modified
    for (const [key, value] of Object.entries(newValues)) {
      if (!(key in oldValues) || String(oldValues[key]) !== value) {
        variables.push(key);
      }
    }

    // Check for removed
    for (const key of Object.keys(oldValues)) {
      if (!(key in newValues)) {
        variables.push(key);
        type = 'removed';
      }
    }

    // Determine type
    if (variables.length === 0) {
      type = 'modified';
    } else if (Object.keys(newValues).length < Object.keys(oldValues).length) {
      type = 'removed';
    } else if (variables.length > Object.keys(oldValues).length) {
      type = 'added';
    }

    return { type, variables };
  }

  /**
   * Private: Hash file content
   */
  private hashFile(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      return '';
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    let hash = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return String(Math.abs(hash));
  }

  /**
   * Private: Handle errors
   */
  private handleError(error: Error): void {
    if (this.onError) {
      this.onError(error);
    } else {
      console.error('Watcher error:', error.message);
    }
  }
}
