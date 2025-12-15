# TER Secret Management Guide

Comprehensive guide to using TER's secret storage backends for secure configuration management.

## Overview

TER provides a unified interface for managing secrets across multiple backends:
- **HashiCorp Vault** - Enterprise secret management
- **AWS Secrets Manager** - AWS-native secret storage
- **Pluggable interface** - Easy to add custom backends

## Quick Start

### Node.js

```typescript
import SecretManager from 'ter/secrets';
import VaultBackend from 'ter/secrets/backends/vault';

// Create backend
const vault = new VaultBackend({
  address: 'https://vault.example.com:8200',
  auth: {
    method: 'token',
    token: process.env.VAULT_TOKEN,
  },
});

// Create manager
const secrets = new SecretManager({
  backends: [vault],
  cache: {
    enabled: true,
    ttl: 5000,
    maxSize: 100,
  },
});

// Get secret
const apiKey = await secrets.getSecret('api_key');

// Store secret
await secrets.putSecret('new_key', 'new_value');

// Delete secret
await secrets.deleteSecret('api_key');

// List secrets
const keys = await secrets.listSecrets('app_*');

// Rotate secret
const newValue = await secrets.rotateSecret('api_key');

// Close
await secrets.close();
```

### Python

```python
from ter.secrets import SecretManager, VaultBackend

# Create backend
vault = VaultBackend({
    'address': 'https://vault.example.com:8200',
    'auth': {
        'method': 'token',
        'token': os.getenv('VAULT_TOKEN'),
    },
})

# Create manager
secrets = SecretManager(
    backends=[vault],
    cache={
        'enabled': True,
        'ttl': 5000,
        'max_size': 100,
    },
)

# Get secret
api_key = await secrets.get_secret('api_key')

# Store secret
await secrets.put_secret('new_key', 'new_value')

# Rotate secret
new_value = await secrets.rotate_secret('api_key')

# Close
await secrets.close()
```

## Backends

### HashiCorp Vault

#### Configuration

```typescript
// Token authentication
const vault = new VaultBackend({
  address: 'https://vault.example.com:8200',
  secretPath: 'secret', // path to KV v2 backend
  auth: {
    method: 'token',
    token: process.env.VAULT_TOKEN,
  },
  tlsSkipVerify: false,
  timeout: 5000, // milliseconds
});

// AppRole authentication
const vault = new VaultBackend({
  address: 'https://vault.example.com:8200',
  auth: {
    method: 'approle',
    roleId: process.env.VAULT_ROLE_ID,
    secretId: process.env.VAULT_SECRET_ID,
  },
});

// JWT authentication
const vault = new VaultBackend({
  address: 'https://vault.example.com:8200',
  auth: {
    method: 'jwt',
    role: 'my-role',
    jwt: process.env.VAULT_JWT, // or async function
  },
});

// Kubernetes authentication
const vault = new VaultBackend({
  address: 'https://vault.example.com:8200',
  auth: {
    method: 'kubernetes',
    role: 'my-app',
    serviceAccountPath: '/var/run/secrets/kubernetes.io/serviceaccount',
  },
});
```

#### Operations

```typescript
// Get secret
const value = await vault.getSecret('database/password');
// Returns: "secret-password" or null if not found

// Put secret
await vault.putSecret('api/key', 'secret-key-value');

// Delete secret
await vault.deleteSecret('api/key');

// List secrets
const keys = await vault.listSecrets('database/*');
// Returns: ['password', 'username', 'host']

// Rotate secret
const newKey = await vault.rotateSecret('api/key');
```

#### Vault Setup

```bash
# Start Vault (development mode)
vault server -dev

# Set token
export VAULT_ADDR='http://localhost:8200'
export VAULT_TOKEN='s.xxxxxxxxxxxxxxxx'

# Create KV v2 secret engine
vault secrets enable -path=secret kv-v2

# Put secrets
vault kv put secret/database/password value='mypassword'
vault kv put secret/api/key value='myapikey'

# Get secrets
vault kv get secret/database/password

# List secrets
vault kv list secret/database

# Setup AppRole
vault auth enable approle
vault write auth/approle/role/my-app \
  token_ttl=1h \
  token_max_ttl=4h \
  policies="default"

# Get role ID
vault read auth/approle/role/my-app/role-id

# Create secret ID
vault write -f auth/approle/role/my-app/secret-id
```

### AWS Secrets Manager

#### Configuration

```typescript
// IAM role authentication (default)
const aws = new AWSSecretsManagerBackend({
  region: 'us-east-1',
  auth: {
    method: 'iam',
  },
});

// Access key authentication
const aws = new AWSSecretsManagerBackend({
  region: 'us-east-1',
  auth: {
    method: 'credentials',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN, // optional
  },
});

// STS assume role authentication
const aws = new AWSSecretsManagerBackend({
  region: 'us-east-1',
  auth: {
    method: 'sts',
    roleArn: 'arn:aws:iam::123456789:role/my-role',
    sessionName: 'my-session',
    duration: 3600, // seconds
  },
});

// With KMS encryption
const aws = new AWSSecretsManagerBackend({
  region: 'us-east-1',
  auth: { method: 'iam' },
  kmsKeyId: 'arn:aws:kms:us-east-1:123456789:key/12345',
});
```

#### Operations

```typescript
// Get secret
const password = await aws.getSecret('prod/db-password');

// Put secret
await aws.putSecret('prod/db-password', 'new-password');

// Delete secret (scheduled for 7 days)
await aws.deleteSecret('prod/db-password');

// List secrets
const secrets = await aws.listSecrets('prod/*');

// Rotate secret
const newPassword = await aws.rotateSecret('prod/db-password');
```

#### AWS Setup

```bash
# Create secret
aws secretsmanager create-secret \
  --name prod/db-password \
  --secret-string 'mypassword' \
  --region us-east-1

# Get secret
aws secretsmanager get-secret-value \
  --secret-id prod/db-password

# List secrets
aws secretsmanager list-secrets --region us-east-1

# Update secret
aws secretsmanager update-secret \
  --secret-id prod/db-password \
  --secret-string 'newpassword'

# Delete secret (scheduled, not immediate)
aws secretsmanager delete-secret \
  --secret-id prod/db-password \
  --force-delete-without-recovery

# Setup IAM role
aws iam create-role \
  --role-name my-app-role \
  --assume-role-policy-document '{"Version":"2012-10-17",...}'

# Attach policy
aws iam put-role-policy \
  --role-name my-app-role \
  --policy-name secrets-access \
  --policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Action":[
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource":"arn:aws:secretsmanager:*:*:secret:prod/*"
    }]
  }'
```

## Advanced Features

### Multiple Backends with Failover

```typescript
const secrets = new SecretManager({
  backends: [
    new VaultBackend({ /* config */ }),
    new AWSSecretsManagerBackend({ /* config */ }),
  ],
  failover: true, // Try next backend on failure
});

// Tries Vault first, falls back to AWS if needed
const secret = await secrets.getSecret('api_key');

// Stores to both backends
await secrets.putSecret('api_key', 'value');

// Deletes from both
await secrets.deleteSecret('api_key');
```

### Caching

```typescript
const secrets = new SecretManager({
  backends: [vault],
  cache: {
    enabled: true,
    ttl: 5000, // 5 seconds
    maxSize: 100, // max 100 cached entries
  },
});

// First call hits backend
const v1 = await secrets.getSecret('key');

// Subsequent calls use cache (within TTL)
const v2 = await secrets.getSecret('key');

// Check cache stats
const stats = secrets.getCacheStats();
console.log(`Cached: ${stats.size}/${stats.maxSize}`);

// Clear cache
secrets.clearCache();

// Manual cache control
const secrets2 = new SecretManager({
  backends: [vault],
  cache: {
    enabled: false, // no caching
  },
});
```

### Audit Logging

```typescript
const secrets = new SecretManager({
  backends: [vault],
  audit: true, // enable audit logging
});

// Operations are logged
await secrets.getSecret('key');
await secrets.putSecret('key', 'value');

// Get audit log
const allOps = secrets.getAuditLog();

// Filter audit log
const getOps = secrets.getAuditLog({ action: 'get' });
const putOps = secrets.getAuditLog({ action: 'put' });
const keyOps = secrets.getAuditLog({ key: 'api_key' });

// Get logs from specific time range
const recentOps = secrets.getAuditLog({
  startTime: new Date(Date.now() - 3600000), // last hour
  endTime: new Date(),
});

// Clear audit log
secrets.clearAuditLog();
```

### Secret Rotation

```typescript
// Rotate secrets automatically
const newValue = await secrets.rotateSecret('api_key');
console.log(`New value: ${newValue}`);

// Rotation clears cache automatically
const cached = await secrets.getSecret('api_key');
// Gets fresh value from backend, not cache
```

### Strict Error Handling

```typescript
const secrets = new SecretManager({
  backends: [vault, aws],
  failover: false, // Don't retry on errors
});

// Throws immediately on any backend error
try {
  await secrets.getSecret('key');
} catch (error) {
  console.error('Secret not found or backend error');
}
```

## Integration Patterns

### Environment Variable Wrapper

```typescript
// Integrate with TER environment system
import { Environment } from 'ter';
import SecretManager from 'ter/secrets';

const secrets = new SecretManager({
  backends: [vault],
});

// Get secrets and inject into environment
const secretValues = {};
for (const key of ['db_password', 'api_key']) {
  secretValues[key] = await secrets.getSecret(key);
}

const env = new Environment(schema, resolver);
// ... use environment with secrets
```

### Lambda/Serverless

```typescript
// Initialize once at container startup
const secrets = new SecretManager({
  backends: [aws],
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 50,
  },
});

exports.handler = async (event, context) => {
  // Use cached secrets within TTL
  const dbPassword = await secrets.getSecret('prod/db-password');
  
  // Process request...
};
```

### CI/CD Pipeline

```bash
#!/bin/bash

# Use Vault for secrets in CI/CD
export VAULT_ADDR="https://vault.company.com:8200"
export VAULT_TOKEN="$(vault write -field=token auth/github/login token=$GITHUB_TOKEN)"

# TER will use these secrets
npm test
npm deploy
```

### Docker/Kubernetes

```dockerfile
# Dockerfile
FROM node:18-alpine

ENV VAULT_ADDR=https://vault.default:8200

# Run app with secret access
CMD ["node", "app.js"]
```

```yaml
# Kubernetes Pod
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  serviceAccountName: my-app
  containers:
  - name: app
    image: my-app:latest
    env:
    - name: VAULT_ADDR
      value: https://vault.default:8200
    - name: VAULT_AUTH_METHOD
      value: kubernetes
    - name: VAULT_ROLE
      value: my-app
```

## Best Practices

### Security

1. **Never commit secrets**
   - Keep tokens/keys in environment variables
   - Use short-lived tokens when possible

2. **Use IAM roles in cloud**
   - AWS Lambda: Use IAM execution role (no key management)
   - Kubernetes: Use ServiceAccount with Vault auth

3. **Enable audit logging**
   - Track all secret access
   - Review audit logs regularly

4. **Rotate secrets regularly**
   - Implement rotation policies
   - Use backend-native rotation when available

5. **Use TLS in transit**
   - Always use HTTPS for backend connections
   - Verify certificates (tlsSkipVerify: false)

### Performance

1. **Enable caching for read-heavy workloads**
   - Reduces backend load
   - Improves response time

2. **Use short TTLs in distributed systems**
   - Reduces stale secret risk
   - Balance between performance and freshness

3. **Lazy initialize secrets**
   - Don't load all secrets on startup
   - Load on-demand as needed

### Operational

1. **Handle errors gracefully**
   - Fallback backends for high availability
   - Implement retry logic

2. **Monitor secret access**
   - Set up alerting on unusual patterns
   - Review audit logs regularly

3. **Test rotation procedures**
   - Verify applications handle rotated secrets
   - Test failover scenarios

## Troubleshooting

### "Secret not found"

```typescript
// Verify secret exists
const secrets = await secretBackend.listSecrets();
console.log(secrets); // Check if key is there

// Check path
const secret = await vault.getSecret('wrong/path');
// May need: secret/data/wrong/path for KV v2
```

### "Authentication failed"

```typescript
// Verify token/credentials
console.log(process.env.VAULT_TOKEN); // Check token is set

// Verify Vault is reachable
curl https://vault.example.com:8200/v1/sys/health

// Check certificate validation
new VaultBackend({
  tlsSkipVerify: true, // Only for development!
});
```

### "Permission denied"

```bash
# Verify policy allows secret access
vault policy read my-policy

# Update policy to allow secret
vault policy write my-policy - <<EOF
path "secret/data/api/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
EOF
```

### Slow secret retrieval

```typescript
// Enable caching
cache: {
  enabled: true,
  ttl: 30000, // 30 seconds
  maxSize: 200,
}

// Check cache stats
const stats = secrets.getCacheStats();
console.log(`Cache hits: ${stats.size} secrets cached`);
```

## API Reference

### SecretManager

```typescript
class SecretManager {
  // Core operations
  async getSecret(key: string): Promise<string>
  async putSecret(key: string, value: string): Promise<void>
  async deleteSecret(key: string): Promise<void>
  async listSecrets(pattern?: string): Promise<string[]>
  async rotateSecret(key: string): Promise<string>
  
  // Audit
  getAuditLog(filter?: AuditFilter): AuditEntry[]
  clearAuditLog(): void
  
  // Cache
  getCacheStats(): CacheStats
  clearCache(): void
  
  // Lifecycle
  async close(): Promise<void>
}
```

### SecretBackend

```typescript
interface SecretBackend {
  name: string
  async isAvailable(): Promise<boolean>
  async getSecret(key: string): Promise<string | null>
  async putSecret(key: string, value: string): Promise<void>
  async deleteSecret(key: string): Promise<void>
  async listSecrets(pattern?: string): Promise<string[]>
  async rotateSecret(key: string): Promise<string> // optional
  async getAuditLog(filter?: AuditFilter): Promise<AuditEntry[]> // optional
  async close(): Promise<void>
}
```

---

**Last Updated**: 2025-12-15  
**Version**: 1.0.0  
**Backends**: 2 (Vault, AWS)
