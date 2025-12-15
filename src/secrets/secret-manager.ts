/**
 * Secret Manager Interface
 *
 * Provides a unified interface for managing secrets from multiple backends.
 * Supports pluggable backends (Vault, AWS Secrets Manager, etc.) with fallback chains.
 */

export interface SecretBackend {
  /**
   * Name of the backend
   */
  name: string;

  /**
   * Whether this backend is currently available/authenticated
   */
  isAvailable(): Promise<boolean>;

  /**
   * Retrieve a secret value
   */
  getSecret(key: string): Promise<string | null>;

  /**
   * Store a secret value
   */
  putSecret(key: string, value: string): Promise<void>;

  /**
   * Delete a secret
   */
  deleteSecret(key: string): Promise<void>;

  /**
   * List all available secret keys
   */
  listSecrets(pattern?: string): Promise<string[]>;

  /**
   * Rotate a secret (if supported)
   */
  rotateSecret?(key: string): Promise<string>;

  /**
   * Get audit log entries (if supported)
   */
  getAuditLog?(filter?: AuditFilter): Promise<AuditEntry[]>;

  /**
   * Close connection and cleanup
   */
  close(): Promise<void>;
}

export interface AuditFilter {
  startTime?: Date;
  endTime?: Date;
  action?: 'get' | 'put' | 'delete' | 'rotate';
  key?: string;
  user?: string;
}

export interface AuditEntry {
  timestamp: Date;
  action: 'get' | 'put' | 'delete' | 'rotate';
  key: string;
  status: 'success' | 'failed';
  user?: string;
  error?: string;
}

export interface SecretManagerConfig {
  backends: SecretBackend[];
  failover?: boolean; // Try next backend on failure
  cache?: CacheConfig;
  audit?: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // milliseconds
  maxSize: number; // max secrets to cache
}

/**
 * SecretManager - Manages secrets across multiple backends with fallback support
 */
export class SecretManager {
  private backends: SecretBackend[];
  private failover: boolean;
  private cache: Map<string, CachedSecret> = new Map();
  private cacheConfig?: CacheConfig;
  private auditLog: AuditEntry[] = [];
  private auditEnabled: boolean;

  constructor(config: SecretManagerConfig) {
    this.backends = config.backends;
    this.failover = config.failover ?? true;
    this.cacheConfig = config.cache;
    this.auditEnabled = config.audit ?? true;
  }

  /**
   * Get a secret from the first available backend
   */
  async getSecret(key: string): Promise<string | null> {
    // Check cache first
    if (this.cacheConfig?.enabled) {
      const cached = this.cache.get(key);
      if (cached && !this.isCacheExpired(cached)) {
        this.recordAudit('get', key, 'success');
        return cached.value;
      }
    }

    // Try each backend
    let backendsAvailable = false;
    for (const backend of this.backends) {
      try {
        if (!(await backend.isAvailable())) continue;
        backendsAvailable = true;

        const value = await backend.getSecret(key);
        if (value !== null) {
          // Cache the result
          if (this.cacheConfig?.enabled) {
            this.setCacheEntry(key, value);
          }
          this.recordAudit('get', key, 'success');
          return value;
        }
      } catch (error) {
        this.recordAudit('get', key, 'failed', (error as Error).message);
        if (!this.failover) throw error;
        continue;
      }
    }

    // If at least one backend was available, return null (key not found)
    if (backendsAvailable) {
      this.recordAudit('get', key, 'success');
      return null;
    }

    // No backends were available
    throw new Error(`Secret '${key}' not found in any backend`);
  }

  /**
   * Store a secret in all configured backends
   */
  async putSecret(key: string, value: string): Promise<void> {
    const errors: Error[] = [];

    for (const backend of this.backends) {
      try {
        if (!(await backend.isAvailable())) continue;
        await backend.putSecret(key, value);
        this.recordAudit('put', key, 'success');
      } catch (error) {
        this.recordAudit('put', key, 'failed', (error as Error).message);
        errors.push(error as Error);
        if (!this.failover) throw error;
      }
    }

    // Update cache
    if (this.cacheConfig?.enabled) {
      this.setCacheEntry(key, value);
    }

    if (errors.length === this.backends.length) {
      throw new Error(`Failed to store secret '${key}' in all backends`);
    }
  }

  /**
   * Delete a secret from all backends
   */
  async deleteSecret(key: string): Promise<void> {
    this.cache.delete(key);
    const errors: Error[] = [];

    for (const backend of this.backends) {
      try {
        if (!(await backend.isAvailable())) continue;
        await backend.deleteSecret(key);
        this.recordAudit('delete', key, 'success');
      } catch (error) {
        this.recordAudit('delete', key, 'failed', (error as Error).message);
        errors.push(error as Error);
        if (!this.failover) throw error;
      }
    }

    if (errors.length === this.backends.length) {
      throw new Error(`Failed to delete secret '${key}' from all backends`);
    }
  }

  /**
   * List secrets from the first available backend
   */
  async listSecrets(pattern?: string): Promise<string[]> {
    for (const backend of this.backends) {
      try {
        if (!(await backend.isAvailable())) continue;
        return await backend.listSecrets(pattern);
      } catch (error) {
        if (!this.failover) throw error;
        continue;
      }
    }

    throw new Error('No backends available for listing secrets');
  }

  /**
   * Rotate a secret (if supported by backend)
   */
  async rotateSecret(key: string): Promise<string> {
    for (const backend of this.backends) {
      try {
        if (!(await backend.isAvailable())) continue;
        if (!backend.rotateSecret) continue;

        const newValue = await backend.rotateSecret(key);
        this.cache.delete(key);
        this.recordAudit('rotate', key, 'success');
        return newValue;
      } catch (error) {
        this.recordAudit('rotate', key, 'failed', (error as Error).message);
        if (!this.failover) throw error;
        continue;
      }
    }

    throw new Error(`Secret '${key}' rotation not supported in any backend`);
  }

  /**
   * Get audit log entries
   */
  getAuditLog(filter?: AuditFilter): AuditEntry[] {
    return this.auditLog.filter((entry) => {
      if (filter?.startTime && entry.timestamp < filter.startTime) return false;
      if (filter?.endTime && entry.timestamp > filter.endTime) return false;
      if (filter?.action && entry.action !== filter.action) return false;
      if (filter?.key && entry.key !== filter.key) return false;
      if (filter?.user && entry.user !== filter.user) return false;
      return true;
    });
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Close all backends
   */
  async close(): Promise<void> {
    await Promise.all(this.backends.map((b) => b.close()));
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cacheConfig?.maxSize ?? 0,
      ttl: this.cacheConfig?.ttl ?? 0,
      entries: Array.from(this.cache.entries()).map(([key, cached]) => ({
        key,
        age: Date.now() - cached.timestamp,
        expired: this.isCacheExpired(cached),
      })),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Private helpers

  private setCacheEntry(key: string, value: string): void {
    if (!this.cacheConfig?.enabled) return;

    // Evict if cache is full
    if (
      this.cacheConfig.maxSize &&
      this.cache.size >= this.cacheConfig.maxSize
    ) {
      const firstKey = this.cache.keys().next().value as string;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  private isCacheExpired(cached: CachedSecret): boolean {
    if (!this.cacheConfig?.ttl) return false;
    return Date.now() - cached.timestamp > this.cacheConfig.ttl;
  }

  private recordAudit(
    action: 'get' | 'put' | 'delete' | 'rotate',
    key: string,
    status: 'success' | 'failed',
    error?: string
  ): void {
    if (!this.auditEnabled) return;

    this.auditLog.push({
      timestamp: new Date(),
      action,
      key,
      status,
      error,
      user: process.env.USER,
    });

    // Keep audit log size bounded (last 1000 entries)
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }
}

interface CachedSecret {
  value: string;
  timestamp: number;
}

export default SecretManager;
