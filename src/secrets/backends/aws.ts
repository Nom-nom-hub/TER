/**
 * AWS Secrets Manager Secret Backend (Stub)
 *
 * This is a stub implementation to demonstrate AWS integration.
 * Full implementation requires AWS SDK installation and is not included
 * to maintain zero production dependencies.
 *
 * To use AWS Secrets Manager in production:
 * 1. Install: npm install @aws-sdk/client-secrets-manager
 * 2. Configure AWS credentials via environment or IAM role
 * 3. Use the full implementation from docs/examples/aws-backend-full.ts
 */

import { SecretBackend } from '../secret-manager';

export interface AWSConfig {
  region: string; // e.g., us-east-1
  auth: AWSAuthConfig;
  retryPolicy?: RetryPolicy;
  kmsKeyId?: string; // Optional KMS key for encryption
}

export type AWSAuthConfig = AWSIAMAuth | AWSCredentialsAuth | AWSSTSAuth;

export interface AWSIAMAuth {
  method: 'iam';
  // Uses default IAM role attached to EC2/Lambda/ECS
}

export interface AWSCredentialsAuth {
  method: 'credentials';
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface AWSSTSAuth {
  method: 'sts';
  roleArn: string;
  sessionName: string;
  duration?: number;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

/**
 * AWS Secrets Manager Backend Implementation (Stub)
 * Throws error if used - requires AWS SDK installation
 */
export class AWSSecretsManagerBackend implements SecretBackend {
  name = 'aws-secrets-manager';
  private config: AWSConfig;

  constructor(config: AWSConfig) {
    this.config = {
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelayMs: 100,
        maxDelayMs: 5000,
      },
      ...config,
    };

    if (!this.config.region) {
      throw new Error('AWS region is required');
    }
  }

  /**
   * Check if AWS Secrets Manager is available
   */
  async isAvailable(): Promise<boolean> {
    return false; // Stub - not available without SDK
  }

  /**
   * Get a secret from AWS Secrets Manager
   */
  async getSecret(_key: string): Promise<string | null> {
    throw new Error(
      'AWS Secrets Manager backend requires AWS SDK installation. ' +
      'Install: npm install @aws-sdk/client-secrets-manager'
    );
  }

  /**
   * Put a secret in AWS Secrets Manager
   */
  async putSecret(_key: string, _value: string): Promise<void> {
    throw new Error(
      'AWS Secrets Manager backend requires AWS SDK installation. ' +
      'Install: npm install @aws-sdk/client-secrets-manager'
    );
  }

  /**
   * Delete a secret from AWS Secrets Manager
   */
  async deleteSecret(_key: string): Promise<void> {
    throw new Error(
      'AWS Secrets Manager backend requires AWS SDK installation. ' +
      'Install: npm install @aws-sdk/client-secrets-manager'
    );
  }

  /**
   * List secrets in AWS Secrets Manager
   */
  async listSecrets(_pattern?: string): Promise<string[]> {
    throw new Error(
      'AWS Secrets Manager backend requires AWS SDK installation. ' +
      'Install: npm install @aws-sdk/client-secrets-manager'
    );
  }

  /**
   * Rotate a secret
   */
  async rotateSecret(_key: string): Promise<string> {
    throw new Error(
      'AWS Secrets Manager backend requires AWS SDK installation. ' +
      'Install: npm install @aws-sdk/client-secrets-manager'
    );
  }

  /**
   * Close the backend connection
   */
  async close(): Promise<void> {
    // Stub - nothing to close
  }
}

export default AWSSecretsManagerBackend;
