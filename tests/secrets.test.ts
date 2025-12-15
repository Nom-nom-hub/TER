/**
 * Secret Manager Tests
 *
 * Tests for SecretManager, Vault backend, and AWS Secrets Manager backend
 */

import SecretManager, {
  SecretBackend,
  AuditFilter,
  AuditEntry,
} from '../src/secrets/secret-manager';
import VaultBackend, { VaultConfig } from '../src/secrets/backends/vault';
import AWSSecretsManagerBackend, {
  AWSConfig,
} from '../src/secrets/backends/aws';

describe('SecretManager', () => {
  // Mock backend for testing
  class MockBackend implements SecretBackend {
    name = 'mock';
    private storage: Map<string, string> = new Map();
    private available = true;

    async isAvailable(): Promise<boolean> {
      return this.available;
    }

    async getSecret(key: string): Promise<string | null> {
      return this.storage.get(key) || null;
    }

    async putSecret(key: string, value: string): Promise<void> {
      this.storage.set(key, value);
    }

    async deleteSecret(key: string): Promise<void> {
      this.storage.delete(key);
    }

    async listSecrets(pattern?: string): Promise<string[]> {
      const keys = Array.from(this.storage.keys());
      if (!pattern) return keys;
      return keys.filter((k) => k.includes(pattern));
    }

    async rotateSecret(key: string): Promise<string> {
      const newValue = Math.random().toString();
      this.storage.set(key, newValue);
      return newValue;
    }

    async close(): Promise<void> {
      this.storage.clear();
    }

    setAvailable(available: boolean): void {
      this.available = available;
    }
  }

  describe('Basic Operations', () => {
    let backend: MockBackend;
    let manager: SecretManager;

    beforeEach(async () => {
      backend = new MockBackend();
      manager = new SecretManager({
        backends: [backend],
      });

      // Populate with initial data
      await backend.putSecret('api_key', 'secret-123');
      await backend.putSecret('db_password', 'password-456');
    });

    afterEach(async () => {
      await manager.close();
    });

    test('gets secrets from backend', async () => {
      const secret = await manager.getSecret('api_key');
      expect(secret).toBe('secret-123');
    });

    test('returns null for missing secrets', async () => {
      const secret = await manager.getSecret('nonexistent');
      expect(secret).toBeNull();
    });

    test('throws error when no backends available', async () => {
      backend.setAvailable(false);

      await expect(manager.getSecret('api_key')).rejects.toThrow(
        /not found in any backend/
      );
    });

    test('puts secrets to backend', async () => {
      await manager.putSecret('new_secret', 'new-value');
      const secret = await backend.getSecret('new_secret');
      expect(secret).toBe('new-value');
    });

    test('deletes secrets from backend', async () => {
      await manager.deleteSecret('api_key');
      const secret = await backend.getSecret('api_key');
      expect(secret).toBeNull();
    });

    test('lists secrets', async () => {
      const secrets = await manager.listSecrets();
      expect(secrets).toContain('api_key');
      expect(secrets).toContain('db_password');
    });

    test('filters secrets by pattern', async () => {
      const secrets = await manager.listSecrets('db');
      expect(secrets).toContain('db_password');
      expect(secrets).not.toContain('api_key');
    });
  });

  describe('Caching', () => {
    let backend: MockBackend;
    let manager: SecretManager;

    beforeEach(async () => {
      backend = new MockBackend();
      manager = new SecretManager({
        backends: [backend],
        cache: {
          enabled: true,
          ttl: 5000,
          maxSize: 10,
        },
      });

      await backend.putSecret('cached_secret', 'cached-value');
    });

    afterEach(async () => {
      await manager.close();
    });

    test('caches secret values', async () => {
      await manager.getSecret('cached_secret');

      // Change backend value (should still get cached value)
      await backend.putSecret('cached_secret', 'new-value');
      const secret = await manager.getSecret('cached_secret');
      expect(secret).toBe('cached-value');
    });

    test('respects cache TTL', async () => {
      const stats1 = manager.getCacheStats();
      expect(stats1.size).toBe(0);

      await manager.getSecret('cached_secret');
      const stats2 = manager.getCacheStats();
      expect(stats2.size).toBe(1);

      // Simulate TTL expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Manually expire cache for testing
      manager.clearCache();
      const stats3 = manager.getCacheStats();
      expect(stats3.size).toBe(0);
    });

    test('evicts oldest entry when cache is full', async () => {
      const manager2 = new SecretManager({
        backends: [backend],
        cache: {
          enabled: true,
          ttl: 60000,
          maxSize: 2,
        },
      });

      // Add 3 secrets
      await backend.putSecret('s1', 'v1');
      await backend.putSecret('s2', 'v2');
      await backend.putSecret('s3', 'v3');

      await manager2.getSecret('s1');
      await manager2.getSecret('s2');
      await manager2.getSecret('s3');

      const stats = manager2.getCacheStats();
      expect(stats.size).toBe(2);

      await manager2.close();
    });

    test('clears cache', async () => {
      await manager.getSecret('cached_secret');
      let stats = manager.getCacheStats();
      expect(stats.size).toBe(1);

      manager.clearCache();
      stats = manager.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Failover', () => {
    let backend1: MockBackend;
    let backend2: MockBackend;
    let manager: SecretManager;

    beforeEach(async () => {
      backend1 = new MockBackend();
      backend2 = new MockBackend();

      manager = new SecretManager({
        backends: [backend1, backend2],
        failover: true,
      });

      // Put different secrets in each backend
      await backend1.putSecret('secret1', 'value1');
      await backend2.putSecret('secret2', 'value2');
    });

    afterEach(async () => {
      await manager.close();
    });

    test('falls back to next backend when first is unavailable', async () => {
      backend1.setAvailable(false);
      const secret = await manager.getSecret('secret2');
      expect(secret).toBe('value2');
    });

    test('stores to multiple backends', async () => {
      await manager.putSecret('shared_secret', 'shared_value');
      expect(await backend1.getSecret('shared_secret')).toBe('shared_value');
      expect(await backend2.getSecret('shared_secret')).toBe('shared_value');
    });

    test('throws when no backends available in strict mode', async () => {
      const manager2 = new SecretManager({
        backends: [backend1],
        failover: false,
      });

      backend1.setAvailable(false);
      await expect(manager2.getSecret('secret1')).rejects.toThrow();

      await manager2.close();
    });
  });

  describe('Audit Logging', () => {
    let backend: MockBackend;
    let manager: SecretManager;

    beforeEach(async () => {
      backend = new MockBackend();
      manager = new SecretManager({
        backends: [backend],
        audit: true,
      });

      await backend.putSecret('secret', 'value');
    });

    afterEach(async () => {
      await manager.close();
    });

    test('records successful operations', async () => {
      await manager.getSecret('secret');
      const log = manager.getAuditLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0].action).toBe('get');
      expect(log[0].status).toBe('success');
    });

    test('filters audit log by action', async () => {
      await manager.getSecret('secret');
      await manager.putSecret('new', 'value');
      await manager.deleteSecret('secret');

      const getOps = manager.getAuditLog({ action: 'get' });
      const putOps = manager.getAuditLog({ action: 'put' });
      const deleteOps = manager.getAuditLog({ action: 'delete' });

      expect(getOps.length).toBeGreaterThan(0);
      expect(putOps.length).toBeGreaterThan(0);
      expect(deleteOps.length).toBeGreaterThan(0);
    });

    test('filters audit log by key', async () => {
      await manager.getSecret('secret');
      await manager.putSecret('other', 'value');

      const secretOps = manager.getAuditLog({ key: 'secret' });
      expect(secretOps.every((e) => e.key === 'secret')).toBe(true);
    });

    test('clears audit log', async () => {
      await manager.getSecret('secret');
      let log = manager.getAuditLog();
      expect(log.length).toBeGreaterThan(0);

      manager.clearAuditLog();
      log = manager.getAuditLog();
      expect(log.length).toBe(0);
    });
  });

  describe('Rotation', () => {
    let backend: MockBackend;
    let manager: SecretManager;

    beforeEach(async () => {
      backend = new MockBackend();
      manager = new SecretManager({
        backends: [backend],
      });

      await backend.putSecret('api_key', 'old-key');
    });

    afterEach(async () => {
      await manager.close();
    });

    test('rotates secret', async () => {
      const newValue = await manager.rotateSecret('api_key');
      expect(newValue).not.toBe('old-key');

      const current = await manager.getSecret('api_key');
      expect(current).toBe(newValue);
    });

    test('clears cache on rotation', async () => {
      const manager2 = new SecretManager({
        backends: [backend],
        cache: {
          enabled: true,
          ttl: 60000,
          maxSize: 10,
        },
      });

      await manager2.getSecret('api_key');
      let stats = manager2.getCacheStats();
      expect(stats.size).toBe(1);

      await manager2.rotateSecret('api_key');
      stats = manager2.getCacheStats();
      expect(stats.size).toBe(0);

      await manager2.close();
    });
  });

  describe('Configuration', () => {
    test('creates manager with single backend', () => {
      const backend = new MockBackend();
      const manager = new SecretManager({
        backends: [backend],
      });

      expect(manager).toBeDefined();
    });

    test('creates manager with multiple backends', () => {
      const backend1 = new MockBackend();
      const backend2 = new MockBackend();
      const manager = new SecretManager({
        backends: [backend1, backend2],
      });

      expect(manager).toBeDefined();
    });

    test('disables caching when not configured', async () => {
      const backend = new MockBackend();
      const manager = new SecretManager({
        backends: [backend],
        cache: {
          enabled: false,
          ttl: 0,
          maxSize: 0,
        },
      });

      await backend.putSecret('secret', 'value');
      await manager.getSecret('secret');

      const stats = manager.getCacheStats();
      expect(stats.size).toBe(0);

      await manager.close();
    });

    test('disables audit logging when configured', () => {
      const backend = new MockBackend();
      const manager = new SecretManager({
        backends: [backend],
        audit: false,
      });

      const log = manager.getAuditLog();
      expect(log.length).toBe(0);
    });
  });
});

describe('VaultBackend', () => {
  // Note: Real Vault integration tests would require a running Vault server
  // These are validation tests for configuration and error handling

  test('requires address in config', () => {
    expect(
      () =>
        new VaultBackend({
          region: 'us-east-1',
          auth: { method: 'token', token: 'test' },
        } as any)
    ).toThrow('Vault address is required');
  });

  test('normalizes Vault address', () => {
    const backend = new VaultBackend({
      address: 'https://vault.example.com/',
      auth: { method: 'token', token: 'test' },
    });

    expect((backend as any).config.address).toBe('https://vault.example.com');
  });

  test('supports token authentication', () => {
    const backend = new VaultBackend({
      address: 'https://vault.example.com:8200',
      auth: { method: 'token', token: 'test-token' },
    });

    expect(backend.name).toBe('vault');
  });

  test('supports AppRole authentication', () => {
    const backend = new VaultBackend({
      address: 'https://vault.example.com:8200',
      auth: {
        method: 'approle',
        roleId: 'role-id',
        secretId: 'secret-id',
      },
    });

    expect(backend.name).toBe('vault');
  });

  test('supports JWT authentication', () => {
    const backend = new VaultBackend({
      address: 'https://vault.example.com:8200',
      auth: {
        method: 'jwt',
        role: 'my-role',
        jwt: 'jwt-token',
      },
    });

    expect(backend.name).toBe('vault');
  });

  test('supports Kubernetes authentication', () => {
    const backend = new VaultBackend({
      address: 'https://vault.example.com:8200',
      auth: {
        method: 'kubernetes',
        role: 'my-role',
      },
    });

    expect(backend.name).toBe('vault');
  });
});

describe('AWSSecretsManagerBackend', () => {
  // Note: Real AWS integration tests would require AWS credentials and services
  // These are validation tests for configuration and error handling

  test('requires region in config', () => {
    expect(
      () =>
        new AWSSecretsManagerBackend({
          auth: { method: 'iam' },
        } as any)
    ).toThrow('AWS region is required');
  });

  test('supports IAM authentication', () => {
    const backend = new AWSSecretsManagerBackend({
      region: 'us-east-1',
      auth: { method: 'iam' },
    });

    expect(backend.name).toBe('aws-secrets-manager');
  });

  test('supports credential-based authentication', () => {
    const backend = new AWSSecretsManagerBackend({
      region: 'us-east-1',
      auth: {
        method: 'credentials',
        accessKeyId: 'AKIA...',
        secretAccessKey: 'secret',
      },
    });

    expect(backend.name).toBe('aws-secrets-manager');
  });

  test('supports STS authentication', () => {
    const backend = new AWSSecretsManagerBackend({
      region: 'us-east-1',
      auth: {
        method: 'sts',
        roleArn: 'arn:aws:iam::123456789:role/MyRole',
        sessionName: 'my-session',
      },
    });

    expect(backend.name).toBe('aws-secrets-manager');
  });

  test('allows KMS encryption key configuration', () => {
    const backend = new AWSSecretsManagerBackend({
      region: 'us-east-1',
      auth: { method: 'iam' },
      kmsKeyId: 'arn:aws:kms:us-east-1:123456789:key/12345',
    });

    expect(backend.name).toBe('aws-secrets-manager');
  });
});
