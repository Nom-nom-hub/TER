# TER Golden Path: Validate Your Config in 5 Minutes

Start here. This is the fastest way to understand and use TER.

**Time**: 5 minutes  
**Outcome**: Validation working, config safe to deploy  
**Tools**: Node.js, npm, your favorite editor  

---

## Step 1: Install TER (30 seconds)

```bash
npm install ter
```

That's it. TER has zero dependencies.

---

## Step 2: Create Your First Contract (1 minute)

Create `.ter.json` in your project:

```json
{
  "DATABASE_URL": {
    "type": "url",
    "required": true
  },
  "PORT": {
    "type": "int",
    "minimum": 1,
    "maximum": 65535,
    "default": 3000
  },
  "API_KEY": {
    "type": "secret",
    "required": true
  },
  "DEBUG": {
    "type": "boolean",
    "default": false
  }
}
```

**What you just did**:
- `DATABASE_URL` - A URL that MUST be provided
- `PORT` - An integer 1-65535, defaults to 3000
- `API_KEY` - A secret that MUST be provided (never logged)
- `DEBUG` - A boolean, defaults to false

---

## Step 3: Create Your Environment File (1 minute)

Create `.env`:

```
DATABASE_URL=postgres://localhost/mydb
PORT=3000
API_KEY=sk_live_abc123def456
DEBUG=false
```

---

## Step 4: Validate (1 minute)

```bash
npx ter check --env .env --contract .ter.json
```

**Expected output**:
```
✅ Valid

All variables defined and valid:
  ✓ DATABASE_URL: postgres://localhost/mydb
  ✓ PORT: 3000
  ✓ API_KEY: [SECRET]
  ✓ DEBUG: false
```

**That's it.** Your configuration is validated.

---

## Step 5: Use in Your Code (1 minute)

In `app.js` or `main.ts`:

```typescript
import { Schema, Types, Environment } from 'ter';

// Define schema
const schema = new Schema();
schema.define('DATABASE_URL', Types.url().markRequired());
schema.define('PORT', Types.int().default(3000));
schema.define('API_KEY', Types.secret().markRequired());
schema.define('DEBUG', Types.boolean().default(false));

// Load and validate
const env = new Environment(schema);
env.init();

// Use it
const dbUrl = env.getString('DATABASE_URL');
const port = env.getInt('PORT');
const apiKey = env.getString('API_KEY'); // Secrets marked as [SECRET] in logs
const debug = env.getBoolean('DEBUG');

console.log(`Server on port ${port}`);
console.log(`Database: ${dbUrl}`);
console.log(`Debug mode: ${debug}`);
// API key is NEVER logged
```

---

## What Happens If Config Is Wrong?

### Missing required variable:

**Delete `API_KEY` from `.env`**

```bash
npx ter check --env .env --contract .ter.json
```

**Output**:
```
❌ Invalid

Errors:
  ✗ API_KEY: Required variable missing
```

**In code**: Application fails at startup with clear error message.

### Wrong type:

**Change `PORT=3000` to `PORT=abc`**

```bash
npx ter check --env .env --contract .ter.json
```

**Output**:
```
❌ Invalid

Errors:
  ✗ PORT: Value 'abc' is not an integer
```

### Out of range:

**Change `PORT=3000` to `PORT=99999`**

```bash
npx ter check --env .env --contract .ter.json
```

**Output**:
```
❌ Invalid

Errors:
  ✗ PORT: Value 99999 exceeds maximum of 65535
```

---

## Next Steps

### If you want to...

**Use in production**
→ Add to your CI/CD:
```yaml
# .github/workflows/deploy.yml
- name: Validate Config
  run: npx ter check --env .env.prod --contract .ter.json
```

**Understand the spec**
→ Read [TER Specification](TER_SPEC_v1.md)

**See more examples**
→ Check [Quickstart Guide](../QUICKSTART.md)

**Integrate with frameworks**
→ See [Integration Guide](./integration/)

**Use with Python or Go**
→ [Multi-Language Guide](../SDK_GUIDE.md)

**Store secrets securely**
→ [Vault Integration](../guides/VAULT_SETUP.md)

---

## Common Patterns

### Pattern 1: Development vs Production

Create different contracts:

**.ter.dev.json**:
```json
{
  "DATABASE_URL": { "type": "url" },
  "API_KEY": { "type": "secret" }
}
```

**.ter.prod.json**:
```json
{
  "DATABASE_URL": { "type": "url", "required": true },
  "API_KEY": { "type": "secret", "required": true },
  "TLS_CERT": { "type": "string", "required": true }
}
```

Validate each:
```bash
npx ter check --env .env.dev --contract .ter.dev.json
npx ter check --env .env.prod --contract .ter.prod.json
```

### Pattern 2: Environment-Specific Defaults

One contract, different .env files:

**.ter.json**:
```json
{
  "DATABASE_URL": { "type": "url", "required": true },
  "LOG_LEVEL": { "type": "enum", "values": ["error", "warn", "info", "debug"], "default": "info" }
}
```

**.env.dev**:
```
DATABASE_URL=postgres://localhost/db
LOG_LEVEL=debug
```

**.env.prod**:
```
DATABASE_URL=postgres://prod.example.com/db
LOG_LEVEL=warn
```

### Pattern 3: Secrets Management

Store sensitive values separately:

**.ter.json**:
```json
{
  "API_KEY": { "type": "secret", "required": true },
  "STRIPE_KEY": { "type": "secret", "required": true }
}
```

**Locally (.env.local - in .gitignore)**:
```
API_KEY=sk_live_...
STRIPE_KEY=sk_live_...
```

**In production**: Store in Vault or secrets manager, TER validates them the same way

---

## Troubleshooting

### "Variable not found"

Make sure:
1. Variable is defined in `.ter.json`
2. Variable exists in `.env` or environment
3. File paths are correct

### "Invalid type"

Check the coercion rules:
- `boolean`: accepts "true", "false", "1", "0", "yes", "no"
- `int`: must be a valid integer
- `url`: must be a valid URL format
- `json`: must be valid JSON

### "Required variable missing"

Either:
1. Add to `.env` file
2. Add to process environment: `export VAR=value`
3. Remove `"required": true` from contract

---

## One More Thing

**TER validates at startup, not runtime.**

This matters:
- ✅ Configuration errors caught immediately
- ✅ No surprise failures mid-request
- ✅ Deployment is confident
- ✅ Debugging is easier

You can't accidentally deploy with missing config.

---

## Now You're Ready

You have:
- ✅ A contract that defines your configuration
- ✅ Validation that catches errors before deploy
- ✅ Type safety across your team
- ✅ Audit trail of what ran

**Next**: Deploy with confidence.

---

**Questions?**
- [Full Documentation](../README.md)
- [API Reference](../SDK_GUIDE.md)
- [Why TER?](./VISION.md)
