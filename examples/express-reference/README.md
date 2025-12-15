# TER Reference Deployment: Express.js

This is a real-world example of deploying an Express.js application with TER environment validation.

**What this demonstrates:**
- Configuration contract definition (`.ter.json`)
- Type-safe configuration access
- CI/CD validation before deployment
- Secret redaction and safety
- Audit-ready configuration
- Multi-environment setup (dev/staging/prod)

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Create `.env`
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
REDIS_URL=redis://localhost:6379
API_KEY=[your-api-key]
JWT_SECRET=[your-jwt-secret]
LOG_LEVEL=debug
```

### 3. Validate configuration
```bash
npm run validate
```

Expected output:
```
✅ Valid

All variables defined and valid:
  ✓ NODE_ENV: development
  ✓ PORT: 3000
  ✓ DATABASE_URL: postgresql://user:password@localhost:5432/myapp
  ✓ REDIS_URL: redis://localhost:6379
  ✓ API_KEY: [SECRET]
  ✓ JWT_SECRET: [SECRET]
  ✓ LOG_LEVEL: debug
  ✓ RATE_LIMIT_MAX: 100 (default)
```

### 4. Run the app
```bash
npm run dev
```

You'll see:
```
==================================================
TER Reference Deployment
==================================================
Environment: development
Server: http://localhost:3000
Database: postgresql://user:password@local...
Redis: redis://localhost:6379
Log Level: debug
Rate Limit: 100 req/min
==================================================
```

### 5. Test endpoints
```bash
# Health check
curl http://localhost:3000/health

# View configuration schema
curl http://localhost:3000/config/schema

# Example API
curl http://localhost:3000/api/example
```

---

## Key Patterns

### Pattern 1: Contract Definition

Define what your app needs (`.ter.json`):

```json
{
  "PORT": {
    "type": "int",
    "minimum": 1,
    "maximum": 65535,
    "default": 3000
  },
  "DATABASE_URL": {
    "type": "url",
    "required": true
  },
  "API_KEY": {
    "type": "secret",
    "required": true
  }
}
```

This is the **contract**. It says:
- PORT is an integer (1-65535), defaults to 3000
- DATABASE_URL is a URL and required
- API_KEY is a secret and required (never logged)

### Pattern 2: Type-Safe Access

In your code:
```typescript
const port = env.getInt('PORT');      // Type: number
const dbUrl = env.getString('DATABASE_URL');  // Type: string
const apiKey = env.getString('API_KEY');      // Type: string (marked as secret)
```

No type guessing. No runtime coercion surprises.

### Pattern 3: Multi-Environment Contracts

Different rules per environment:

**Development** (`.ter.json`):
- DATABASE_URL required
- REDIS_URL optional (defaults to localhost)
- TLS_CERT_PATH not required

**Production** (`.ter.prod.json`):
- DATABASE_URL required
- REDIS_URL required (can't use localhost in prod)
- TLS_CERT_PATH required
- NODE_ENV must be "production"

### Pattern 4: CI/CD Validation

```yaml
# .github/workflows/deploy.yml
- name: Validate Configuration
  run: npx ter check --env .env.prod --contract .ter.prod.json

- name: Deploy
  if: success()  # Only deploy if validation passes
  run: vercel deploy
```

**Key benefit**: Configuration validation happens **before** deployment.
- Missing variables caught in CI/CD, not in production
- Type errors caught early
- Fail fast principle

### Pattern 5: Secret Redaction

When you call:
```typescript
const apiKey = env.getString('API_KEY');
```

In logs, it appears as:
```
[INFO] API_KEY: [SECRET]
```

Never:
```
[INFO] API_KEY: sk_live_1234567890abcdef
```

### Pattern 6: Audit Trail

Your app can generate compliance-ready configuration proof:

```typescript
const auditTrail = {
  timestamp: new Date().toISOString(),
  application: 'my-app',
  configurationStatus: 'valid',
  environment: 'production',
  configurationSchema: schema.toJSON(),
  // Note: Actual secret values are NEVER included
};
```

This goes to your compliance/audit system.

---

## What Happens When Config Is Wrong?

### Missing required variable

Remove `API_KEY` from `.env`:
```bash
npm run validate
```

Output:
```
❌ Invalid

Errors:
  ✗ API_KEY: Required variable missing
```

App **will not start**. ✅

### Wrong type

Change `PORT=abc`:
```bash
npm run validate
```

Output:
```
❌ Invalid

Errors:
  ✗ PORT: Value 'abc' is not an integer
```

App **will not start**. ✅

### Out of range

Change `PORT=99999`:
```bash
npm run validate
```

Output:
```
❌ Invalid

Errors:
  ✗ PORT: Value 99999 exceeds maximum of 65535
```

App **will not start**. ✅

### Invalid URL

Change `DATABASE_URL=not-a-url`:
```bash
npm run validate
```

Output:
```
❌ Invalid

Errors:
  ✗ DATABASE_URL: Value 'not-a-url' is not a valid URL
```

App **will not start**. ✅

---

## Real-World Scenarios

### Scenario 1: Onboarding a New Engineer

**Before (without TER):**
- "Hey, what environment variables do I need?"
- "Uh, check the code I guess?"
- 30 minutes of trial and error
- "Oh wait, you also need REDIS_URL"
- Debugging code instead of setting config

**After (with TER):**
- "What vars do I need?"
- `cat .ter.json` or `npm run validate`
- Clear schema visible
- Set them, validate, done

### Scenario 2: Staging vs Production

Same codebase, different requirements:

```bash
# Staging
npm run validate
# Uses .ter.json (more lenient)

# Production
npm run validate:prod
# Uses .ter.prod.json (stricter)
# Requires TLS certs, real Redis, real database
```

Fail early if production config is incomplete.

### Scenario 3: Compliance Audit

Auditor asks: "Can you prove this app ran with correct configuration?"

You show:
1. `.ter.prod.json` - The specification
2. CI/CD logs - Validation passed before deployment
3. Audit trail - What configuration actually ran

**Without TER**: "Um, I think so? Let me check the git logs..."

**With TER**: "Here's the proof, here's the specification."

### Scenario 4: Deploying to New Environment

Adding a staging environment:

1. Create `.env.staging`
2. Create `.ter.staging.json` (or reuse `.ter.json`)
3. Add CI/CD step: `ter check --env .env.staging --contract .ter.staging.json`
4. Deploy

No guessing. No "is this config right?"

---

## Integration with Your Stack

### Docker

```dockerfile
FROM node:18

WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

# Validate configuration before app starts
RUN npx ter check --env .env.prod --contract .ter.prod.json

CMD ["npm", "start"]
```

### Kubernetes

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  .ter.json: |
    {
      "DATABASE_URL": { "type": "url", "required": true },
      "API_KEY": { "type": "secret", "required": true }
    }

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  containers:
  - name: app
    image: my-app:latest
    env:
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: database-url
    - name: API_KEY
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: api-key
    # Validation happens in app startup
```

### Terraform / Infrastructure as Code

```hcl
resource "aws_ecs_task_definition" "app" {
  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "my-app:latest"
      essential = true
      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "DATABASE_URL"
          value = aws_db_instance.main.endpoint
        },
        # All other required vars...
      ]
      # TER validates these before container starts
    }
  ])
}
```

---

## Troubleshooting

### Q: Why won't the app start?

Run: `npm run validate`

This shows you exactly what's missing or wrong.

### Q: How do I handle secrets in CI/CD?

Don't put them in `.env` files. Use CI/CD secrets:

```yaml
- name: Validate Production Config
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    API_KEY: ${{ secrets.API_KEY }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
  run: npx ter check --contract .ter.prod.json
```

### Q: Can I have optional environment variables?

Yes. Just don't set `required: true`:

```json
{
  "CORS_ORIGIN": {
    "type": "url",
    "required": false
  }
}
```

Or omit `required` entirely.

### Q: How do I use different configs per environment?

Create different contracts:

- `.ter.dev.json` - Development (loose)
- `.ter.staging.json` - Staging (moderate)
- `.ter.prod.json` - Production (strict)

Validate against the right one in CI/CD.

---

## What's Next?

1. **Implement in your own app** - Copy this pattern to your codebase
2. **Add to CI/CD** - Use the GitHub Actions workflow as a template
3. **Share the schema** - Ops teams can see what your app needs
4. **Generate documentation** - `npx ter explain VAR` for each variable
5. **Audit compliance** - Use the audit trail for regulatory proof

---

## Learning Resources

- [TER Quick Start](../../docs/GOLDEN_PATH.md)
- [TER Specification](../../docs/TER_SPEC_v1.md)
- [Why Environment Variables Are Broken](../../docs/WHY_ENV_VARS_ARE_BROKEN.md)
- [TER Vision](../../docs/VISION.md)

---

## Production Readiness Checklist

- [x] Configuration contract defined (`.ter.json`)
- [x] Multiple environment contracts (dev/staging/prod)
- [x] CI/CD validation step added
- [x] Secret handling implemented
- [x] Deployment only happens after validation
- [x] Audit trail generation ready
- [x] Type-safe configuration access
- [x] Error handling for missing config

This app is **production-ready** with TER validation.
