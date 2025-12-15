/**
 * HashiCorp Vault Secret Backend
 *
 * Integrates with HashiCorp Vault for secure secret storage.
 * Supports multiple auth methods: token, AppRole, JWT, Kubernetes.
 */

import * as https from 'https';
import { SecretBackend, AuditFilter, AuditEntry } from '../secret-manager';

export interface VaultConfig {
  address: string; // e.g., https://vault.example.com:8200
  secretPath?: string; // e.g., secret/data (default: secret)
  auth: VaultAuthConfig;
  tlsSkipVerify?: boolean;
  timeout?: number;
}

export type VaultAuthConfig =
  | VaultTokenAuth
  | VaultAppRoleAuth
  | VaultJWTAuth
  | VaultKubernetesAuth;

export interface VaultTokenAuth {
  method: 'token';
  token: string;
}

export interface VaultAppRoleAuth {
  method: 'approle';
  roleId: string;
  secretId: string;
}

export interface VaultJWTAuth {
  method: 'jwt';
  role: string;
  jwt: string | (() => Promise<string>); // JWT token or callable to fetch it
}

export interface VaultKubernetesAuth {
  method: 'kubernetes';
  role: string;
  serviceAccountPath?: string;
}

/**
 * Vault Backend Implementation
 */
export class VaultBackend implements SecretBackend {
  name = 'vault';
  private config: VaultConfig;
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private requestTimeout: NodeJS.Timeout | null = null;

  constructor(config: VaultConfig) {
    this.config = {
      secretPath: 'secret',
      ...config,
    };

    if (!this.config.address) {
      throw new Error('Vault address is required');
    }

    // Normalize address (remove trailing slash)
    this.config.address = this.config.address.replace(/\/$/, '');
  }

  /**
   * Check if Vault is available and authenticated
   */
  async isAvailable(): Promise<boolean> {
    try {
      // If we have a valid token, we're good
      if (this.token && Date.now() < this.tokenExpiry) {
        return true;
      }

      // Try to authenticate
      await this.authenticate();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get a secret from Vault
   */
  async getSecret(key: string): Promise<string | null> {
    await this.ensureAuthenticated();

    const response = await this.request('GET', `/v1/${this.config.secretPath}/data/${key}`);

    if (response.statusCode === 404) {
      return null;
    }

    if (response.statusCode !== 200) {
      throw new Error(
        `Failed to get secret from Vault: ${response.statusCode} ${response.statusMessage}`
      );
    }

    const data = JSON.parse(response.data);
    return data.data?.data?.[key] || data.data?.data?.value || null;
  }

  /**
   * Put a secret in Vault
   */
  async putSecret(key: string, value: string): Promise<void> {
    await this.ensureAuthenticated();

    const body = JSON.stringify({
      data: {
        [key]: value,
      },
    });

    const response = await this.request(
      'POST',
      `/v1/${this.config.secretPath}/data/${key}`,
      body
    );

    if (response.statusCode !== 200) {
      throw new Error(
        `Failed to put secret in Vault: ${response.statusCode} ${response.statusMessage}`
      );
    }
  }

  /**
   * Delete a secret from Vault
   */
  async deleteSecret(key: string): Promise<void> {
    await this.ensureAuthenticated();

    const response = await this.request('DELETE', `/v1/${this.config.secretPath}/data/${key}`);

    if (response.statusCode !== 204) {
      throw new Error(
        `Failed to delete secret from Vault: ${response.statusCode} ${response.statusMessage}`
      );
    }
  }

  /**
   * List secrets in Vault
   */
  async listSecrets(pattern?: string): Promise<string[]> {
    await this.ensureAuthenticated();

    const basePath = pattern
      ? `${this.config.secretPath}/data/${pattern}`
      : `${this.config.secretPath}/data`;

    const response = await this.request('LIST', `/v1/${basePath}`);

    if (response.statusCode === 404) {
      return [];
    }

    if (response.statusCode !== 200) {
      throw new Error(
        `Failed to list secrets from Vault: ${response.statusCode} ${response.statusMessage}`
      );
    }

    const data = JSON.parse(response.data);
    return data.data?.keys || [];
  }

  /**
   * Rotate a secret in Vault (database specific)
   */
  async rotateSecret(key: string): Promise<string> {
    await this.ensureAuthenticated();

    // Rotate by setting a new value
    const newValue = this.generateRandomSecret();
    await this.putSecret(key, newValue);
    return newValue;
  }

  /**
   * Get audit log from Vault
   */
  async getAuditLog(filter?: AuditFilter): Promise<AuditEntry[]> {
    // Vault audit logs require special endpoint and permissions
    // This is a simplified implementation
    const entries: AuditEntry[] = [];

    // In a real implementation, you'd query Vault's audit backend
    // For now, return empty to indicate feature is available but not fully implemented
    return entries;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.requestTimeout) {
      clearTimeout(this.requestTimeout);
    }
  }

  // Private helpers

  private async ensureAuthenticated(): Promise<void> {
    // If token is still valid, skip re-authentication
    if (this.token && Date.now() < this.tokenExpiry) {
      return;
    }

    await this.authenticate();
  }

  private async authenticate(): Promise<void> {
    const authConfig = this.config.auth;

    switch (authConfig.method) {
      case 'token':
        this.token = authConfig.token;
        this.tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        break;

      case 'approle':
        await this.authenticateAppRole(authConfig);
        break;

      case 'jwt':
        await this.authenticateJWT(authConfig);
        break;

      case 'kubernetes':
        await this.authenticateKubernetes(authConfig);
        break;

      default:
        throw new Error(`Unknown auth method: ${(authConfig as any).method}`);
    }
  }

  private async authenticateAppRole(auth: VaultAppRoleAuth): Promise<void> {
    const body = JSON.stringify({
      role_id: auth.roleId,
      secret_id: auth.secretId,
    });

    const response = await this.request('POST', '/v1/auth/approle/login', body, true);

    if (response.statusCode !== 200) {
      throw new Error(
        `AppRole authentication failed: ${response.statusCode} ${response.statusMessage}`
      );
    }

    const data = JSON.parse(response.data);
    this.token = data.auth?.client_token;
    this.tokenExpiry = Date.now() + (data.auth?.lease_duration || 3600) * 1000;

    if (!this.token) {
      throw new Error('No token received from Vault');
    }
  }

  private async authenticateJWT(auth: VaultJWTAuth): Promise<void> {
    const jwt = typeof auth.jwt === 'function' ? await auth.jwt() : auth.jwt;

    const body = JSON.stringify({
      role: auth.role,
      jwt,
    });

    const response = await this.request('POST', '/v1/auth/jwt/login', body, true);

    if (response.statusCode !== 200) {
      throw new Error(
        `JWT authentication failed: ${response.statusCode} ${response.statusMessage}`
      );
    }

    const data = JSON.parse(response.data);
    this.token = data.auth?.client_token;
    this.tokenExpiry = Date.now() + (data.auth?.lease_duration || 3600) * 1000;

    if (!this.token) {
      throw new Error('No token received from Vault');
    }
  }

  private async authenticateKubernetes(auth: VaultKubernetesAuth): Promise<void> {
    // Read service account token from Kubernetes
    const fs = require('fs').promises;
    const serviceAccountPath = auth.serviceAccountPath || '/var/run/secrets/kubernetes.io/serviceaccount';
    const token = await fs.readFile(`${serviceAccountPath}/token`, 'utf-8');

    const body = JSON.stringify({
      role: auth.role,
      jwt: token.trim(),
    });

    const response = await this.request('POST', '/v1/auth/kubernetes/login', body, true);

    if (response.statusCode !== 200) {
      throw new Error(
        `Kubernetes authentication failed: ${response.statusCode} ${response.statusMessage}`
      );
    }

    const data = JSON.parse(response.data);
    this.token = data.auth?.client_token;
    this.tokenExpiry = Date.now() + (data.auth?.lease_duration || 3600) * 1000;

    if (!this.token) {
      throw new Error('No token received from Vault');
    }
  }

  private async request(
    method: string,
    path: string,
    body?: string,
    skipAuth?: boolean
  ): Promise<VaultResponse> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.config.address + path);

      const options = {
        hostname: url.hostname,
        port: url.port || 8200,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Vault-Request': 'true',
        } as Record<string, string>,
        rejectUnauthorized: !this.config.tlsSkipVerify,
        timeout: this.config.timeout || 5000,
      };

      if (this.token && !skipAuth) {
        options.headers['X-Vault-Token'] = this.token;
      }

      if (body) {
        options.headers['Content-Length'] = String(Buffer.byteLength(body));
      }

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 500,
            statusMessage: res.statusMessage,
            data,
            headers: res.headers,
          });
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }

  private generateRandomSecret(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}

interface VaultResponse {
  statusCode: number;
  statusMessage?: string;
  data: string;
  headers: Record<string, any>;
}

export default VaultBackend;
