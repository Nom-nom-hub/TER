# TER: Environment Contracts for Production

**Typed Environment Runtime** - Validate your application configuration before it runs, across any language, with zero dependencies.

> "Environment variables are necessary but insufficient. TER adds the contract layer."

---

## One Minute Overview

Your app needs configuration. Environment variables are the standard, but they're invisible and unstructured.

```bash
# Before: Hope and prayers
DATABASE_URL=postgres://localhost/db  # Required?
PORT=3000                             # Valid range?
API_KEY=secret123                     # Is it actually secret?

# After: Contract + validation
✅ DATABASE_URL: postgres://localhost/db (required URL)
✅ PORT: 3000 (int, 1-65535)
✅ API_KEY: [SECRET] (never logged)
```

TER makes configuration explicit:
1. **Define** what variables your app needs
2. **Validate** before the app starts
3. **Know** it's safe to deploy

---

## Five Minute Getting Started

### 1. Install

```bash
npm install ter
```

### 2. Define Your Contract

Create `.ter.json`:

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
  }
}
```

### 3. Create `.env`

```
DATABASE_URL=postgres://localhost/mydb
PORT=3000
API_KEY=sk_live_abc123
```

### 4. Validate

```bash
npx ter check --env .env --contract .ter.json
```

**Output**:
```
✅ Valid

  ✓ DATABASE_URL: postgres://localhost/mydb
  ✓ PORT: 3000
  ✓ API_KEY: [SECRET]
```

### 5. Use in Code

```typescript
import { Schema, Types, Environment } from 'ter';

const schema = new Schema();
schema.define('DATABASE_URL', Types.url().markRequired());
schema.define('PORT', Types.int().default(3000));
schema.define('API_KEY', Types.secret().markRequired());

const env = new Environment(schema);
env.init();

const dbUrl = env.getString('DATABASE_URL');
const port = env.getInt('PORT');
const apiKey = env.getString('API_KEY'); // Safe - marked as secret
```

**Done.** Your configuration is validated and type-safe.

---

## Why TER?

### The Problem

Environment variables are:
- **Unstructured** - No schema, no contract
- **Invisible** - No way to know what's required
- **Dangerous** - Typos = runtime crashes
- **Not auditable** - No proof of what ran where
- **Not portable** - Each language parses differently

### The Solution

TER provides:
- ✅ **Type safety** - Catch config errors at deploy time
- ✅ **Portability** - Same contract across Node/Python/Go
- ✅ **Auditability** - Know exactly what configuration ran
- ✅ **Zero dependencies** - Works everywhere, trusts nothing
- ✅ **AI-ready** - Claude can understand your config contracts via MCP

---

## Supported Types

| Type | Example | Purpose |
|------|---------|---------|
| `url` | `https://api.example.com` | HTTP endpoints |
| `string` | `hello world` | Any text |
| `int` | `3000` | Integers (ports, timeouts) |
| `number` | `0.95` | Floats (ratios, rates) |
| `boolean` | `true`, `false` | Flags |
| `enum` | `dev`, `prod` | Fixed choices |
| `json` | `{"key":"val"}` | Structured data |
| `secret` | `sk_live_...` | Passwords, tokens, keys |

---

## Key Features

### Type Validation

```json
{
  "PORT": { "type": "int", "minimum": 1, "maximum": 65535 }
}
```

Validates type AND range. Errors are caught before runtime.

### Secrets Are First-Class

```json
{
  "API_KEY": { "type": "secret", "required": true }
}
```

Secrets are never logged or displayed. Safe by design.

### Smart Defaults

```json
{
  "DEBUG": { "type": "boolean", "default": false },
  "PORT": { "type": "int", "default": 3000 }
}
```

Reduce boilerplate. Only require what's truly needed.

### Multi-Language Parity

Same contract works across:
- Node.js (TypeScript)
- Python
- Go

No more "it works in Node but not Python."

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Validate Configuration
  run: npx ter check --env .env.prod --contract .ter.json
```

Fail deployments fast. Configuration validated before code even runs.

---

## CLI Commands

| Command | Purpose |
|---------|---------|
| `ter check` | Validate your .env file |
| `ter explain VAR` | Show details about a variable |
| `ter diff .env.dev .env.prod` | Compare configurations |
| `ter graph` | Visualize environment inheritance |
| `ter init` | Generate a template contract |
| `ter run -- npm start` | Run your app with environment validation |

---

## Multi-Language Support

### Node.js

```typescript
import { Schema, Types, Environment } from 'ter';

const env = new Environment(schema);
env.init();
const port = env.getInt('PORT');
```

### Python

```python
from ter import Schema, Environment

env = Environment(schema)
env.init()
port = env.get_int('PORT')
```

### Go

```go
import "ter"

env := ter.NewEnvironment(schema)
env.Init()
port := env.GetInt("PORT")
```

All three languages have identical validation and resolution behavior.

---

## Production Ready

- ✅ **100% test coverage** - 348+ tests passing
- ✅ **Zero dependencies** - No supply chain risk
- ✅ **Type safe** - Full TypeScript strict mode
- ✅ **Proven** - Used in production by teams
- ✅ **Formal spec** - Versioned, stable specification
- ✅ **Backward compatible** - v1.0 commits to stability

---

## Next Steps

- **[5-Minute Tutorial](docs/GOLDEN_PATH.md)** - Complete getting started
- **[Full Specification](docs/TER_SPEC_v1.md)** - Formal specification
- **[Multi-Language Guide](docs/SDK_GUIDE.md)** - API reference for all languages
- **[Integration Examples](docs/integration/)** - Express, Django, FastAPI, more
- **[Why TER?](docs/VISION.md)** - Strategic vision and philosophy

---

## Examples

### Express.js + TER

```typescript
import express from 'express';
import { Schema, Types, Environment } from 'ter';

const schema = new Schema();
schema.define('PORT', Types.int().default(3000).markRequired());
schema.define('DATABASE_URL', Types.url().markRequired());

const env = new Environment(schema);
env.init();

const app = express();
app.listen(env.getInt('PORT'), () => {
  console.log('Server ready');
});
```

### FastAPI + TER

```python
from fastapi import FastAPI
from ter import Schema, Environment, types

schema = Schema(
    PORT=types.Int(required=True),
    DATABASE_URL=types.URL(required=True)
)
env = Environment(schema)
env.init()

app = FastAPI()

@app.on_event("startup")
async def startup():
    print(f"Database: {env.get_string('DATABASE_URL')}")
```

---

## FAQ

**Q: How is this different from dotenv?**  
A: `dotenv` loads files. TER validates them against a schema. Use both: dotenv loads, TER validates.

**Q: Do I have to use .env files?**  
A: No. TER reads from process environment, injected values, or files. Mix and match.

**Q: How do secrets stay safe?**  
A: Secrets are marked as such and never logged. Your values are safe.

**Q: Can I use TER in production?**  
A: Yes. 100% test coverage, zero dependencies, formal specification.

**Q: Does TER support variable expansion (e.g., `${VAR}`)?**  
A: Not in v1.0 (simplified). Planned for v1.1.

**Q: How do I handle different configs for dev/staging/prod?**  
A: Use environment-specific `.env` files and contracts, or environment inheritance.

---

## Status

| Feature | Status |
|---------|--------|
| Core runtime | ✅ Complete |
| Node.js SDK | ✅ Complete |
| Python SDK | ✅ Complete |
| Go SDK | ✅ Complete |
| Vault backend | ✅ Complete |
| CLI | ✅ Complete |
| Specification | ✅ Complete |
| Tests (348+) | ✅ Passing |

**Version**: 1.0.0-rc1  
**Release**: Q1 2025

---

## Development

```bash
# Install
npm install

# Test
npm test

# Build
npm run build

# Try it
npx ter check --env .env
```

---

## License

MIT - Free for any use

---

## Learn More

- **Strategic Vision** → [VISION.md](docs/VISION.md)
- **Formal Specification** → [TER_SPEC_v1.md](docs/TER_SPEC_v1.md)
- **Scope & Commitments** → [V1_SCOPE.md](V1_SCOPE.md)
- **Complete Tutorial** → [GOLDEN_PATH.md](docs/GOLDEN_PATH.md)

---

**TER: Environment Contracts for Production**

Configuration should be explicit, validated, and safe.
