# TER v1.0.0-rc1: Environment Contracts for Production

**Release Date**: December 15, 2025  
**Status**: Release Candidate 1  
**Target**: v1.0.0 (Final) January 2026

---

## 🚀 What Is TER?

**Typed Environment Runtime** is a contract-driven environment validation platform for Node.js, Python, and Go.

Instead of hoping your environment variables are correct, TER makes configuration an explicit contract that's validated before your app starts.

```bash
# Define what your app needs
{
  "PORT": { "type": "int", "minimum": 1, "maximum": 65535 },
  "DATABASE_URL": { "type": "url", "required": true },
  "API_KEY": { "type": "secret", "required": true }
}

# Validate before deployment
npx ter check --env .env --contract .ter.json
# ✅ Valid (or ❌ fail fast with clear errors)

# Use in code (type-safe, no guessing)
const port = env.getInt('PORT');           // number, not string
const dbUrl = env.getString('DATABASE_URL'); // string
const apiKey = env.getString('API_KEY');     // marked secret, never logged
```

---

## ✅ What's Included in RC1

### Core Runtime
- ✅ **Type System** - 8 types: string, int, number, boolean, enum, url, json, secret
- ✅ **Schema Definition & Validation** - Machine-readable contracts
- ✅ **Multi-Source Resolution** - Injected > file > process > default
- ✅ **Type-Safe Getters** - No runtime surprises
- ✅ **Secret Redaction** - Secrets never logged

### Language SDKs (Production-Ready)
- ✅ **Node.js** - Full TypeScript, 95+ tests
- ✅ **Python** - Feature parity, type hints, 56+ tests
- ✅ **Go** - Idiomatic implementation, benchmarks, 50+ tests

### CLI Tools (6 Commands)
- ✅ `ter check` - Validate environment
- ✅ `ter explain VAR` - Show variable details
- ✅ `ter diff FILE1 FILE2` - Compare environments
- ✅ `ter graph` - Visualize inheritance
- ✅ `ter run -- COMMAND` - Execute with validation
- ✅ `ter init` - Generate template contract
- ✅ Interactive REPL mode (bonus)

### Integrations
- ✅ **Vault** - Full secret backend (token, AppRole, JWT, K8s auth)
- ✅ **MCP** - Claude/AI integration via Model Context Protocol
- ✅ **JSON Schema Export** - Generate schemas for external tools
- ✅ **DotEnv Adapter** - Parse .env files with validation

### Quality & Documentation
- ✅ **348+ Passing Tests** - 100% coverage on core runtime
- ✅ **Zero Dependencies** - No supply chain risk
- ✅ **Formal Specification** - TER_SPEC_v1.md (versioned, stable)
- ✅ **Complete Documentation** - VISION.md, GOLDEN_PATH.md, integration guides

---

## 🎯 Strategic Positioning

TER is positioned as **infrastructure for configuration management**, not as a convenience library.

| Aspect | Old View | RC1 Positioning |
|--------|----------|-----------------|
| **Category** | Configuration library | Infrastructure platform |
| **What it does** | Parses .env files | Validates environment contracts |
| **Who buys** | Individual developers | Platform teams, DevOps, enterprises |
| **Competition** | vs dotenv | New category (no direct competitor) |
| **Proof** | Great code | Reference deployment (Express.js) |

**Key insight**: Environment variables are necessary but insufficient. TER adds the contract layer.

---

## 🔍 How RC1 Proves This Works

### Reference Deployment (Real-World Integration)
We've included a complete Express.js application (`examples/express-reference/`) that demonstrates:

- ✅ Type-safe configuration access
- ✅ Multi-environment support (dev vs prod contracts)
- ✅ CI/CD validation workflow (GitHub Actions)
- ✅ Secret redaction in logs
- ✅ Audit trail generation
- ✅ Compliance-ready output

**This is not a toy example.** It shows exactly how production teams integrate TER.

---

## 📦 Installation

### Node.js
```bash
npm install ter
```

### Python
```bash
pip install ter-sdk
```

### Go
```bash
go get github.com/ter-sdk/ter-go
```

---

## ⚡ 5-Minute Getting Started

### 1. Define Your Contract (.ter.json)
```json
{
  "DATABASE_URL": {
    "type": "url",
    "required": true
  },
  "PORT": {
    "type": "int",
    "default": 3000,
    "minimum": 1,
    "maximum": 65535
  }
}
```

### 2. Create .env
```
DATABASE_URL=postgres://localhost/mydb
PORT=3000
```

### 3. Validate
```bash
npx ter check --env .env --contract .ter.json
```

### 4. Use in Code
```typescript
import { Schema, Types, Environment } from 'ter';

const schema = new Schema();
schema.define('DATABASE_URL', Types.url().markRequired());
schema.define('PORT', Types.int().default(3000));

const env = new Environment(schema);
env.init();  // Validates and fails if config is wrong

const dbUrl = env.getString('DATABASE_URL');
const port = env.getInt('PORT');
```

**Done.** Your configuration is now validated and type-safe.

See **[GOLDEN_PATH.md](docs/GOLDEN_PATH.md)** for the complete tutorial.

---

## 📚 Documentation

- **[VISION.md](docs/VISION.md)** - Strategic vision and why this matters
- **[TER_SPEC_v1.md](docs/TER_SPEC_v1.md)** - Formal specification (implementable in any language)
- **[V1_SCOPE.md](V1_SCOPE.md)** - What's in v1.0, what's deferred to v1.1+
- **[GOLDEN_PATH.md](docs/GOLDEN_PATH.md)** - Complete 5-minute tutorial
- **[RELEASE_NOTES.md](RELEASE_NOTES_v1.0.0-rc1.md)** - Detailed feature list
- **[Reference Deployment](examples/express-reference/)** - Real-world integration example

---

## 🧪 Testing

| Suite | Status | Count |
|-------|--------|-------|
| Core runtime | ✅ Passing | 100+ |
| Node.js SDK | ✅ Passing | 95+ |
| Python SDK | ✅ Passing | 56+ |
| Go SDK | ✅ Passing | 50+ |
| Adapters | ✅ Passing | 30+ |
| Integrations | ✅ Passing | 17+ |
| **Total** | **✅ Passing** | **348+** |

### Known Limitations (Non-Blocking)
- 3 edge-case tests deferred (dotenv-expansion, hot-reload, multiline): documented in [DEV.md](DEV.md)
- These features are explicitly deferred to v1.1 per [V1_SCOPE.md](V1_SCOPE.md)

---

## 🔒 Production Ready

- ✅ **Zero dependencies** - No supply chain risk
- ✅ **100% type-safe** - TypeScript strict mode
- ✅ **Formal specification** - Versioned, stable, implementable in any language
- ✅ **Multi-language parity** - Same behavior across Node/Python/Go
- ✅ **API stability** - No breaking changes planned for v1.0.x

---

## 📋 What's NOT in v1.0 (Deferred to v1.1+)

Deliberately excluded to maintain focus:
- ❌ Ruby, Java, Rust SDKs (community contributions welcome)
- ❌ Variable expansion (`${VAR}` syntax)
- ❌ Plugin system
- ❌ Template marketplace
- ❌ Additional secret backends (AWS, GCP, etc.)
- ❌ Configuration versioning
- ❌ Advanced audit storage

See **[V1_SCOPE.md](V1_SCOPE.md)** for complete rationale.

---

## 🤝 Getting Help

### Try It Out
1. Read [GOLDEN_PATH.md](docs/GOLDEN_PATH.md) (5 minutes)
2. Review [examples/express-reference/](examples/express-reference/) (real-world integration)
3. Run `npx ter init` to generate a template

### Feedback
- **Report issues** on GitHub
- **Ask questions** in GitHub discussions
- **Share feedback** on positioning and messaging

### For RC1 Testing
The goal of this release candidate is **external validation**. We want to know:
- Does the reference deployment work for you?
- Is the positioning clear (infrastructure, not convenience)?
- Do the 3 SDKs feel consistent?
- What would make this useful for your team?

---

## 🗓️ Timeline

| Phase | Target | Status |
|-------|--------|--------|
| **RC1 Feedback** | Weeks 2-3 | 🔜 Next |
| **RC1 Issues** | Week 2-3 | 🔜 Next |
| **v1.0.0 Final** | Week 3-4 | 🔜 Next |
| **Official Launch** | January 2026 | 🔜 Later |

---

## 📄 License

MIT - Free for any use

---

## 🎓 Key Concepts

### Contract vs Configuration
- **Contract** = What the app needs (.ter.json)
- **Configuration** = What you provide (.env)
- **TER** = The validator that matches them

### Multi-Source Resolution
TER checks variables in this order (first match wins):
1. **Injected** - Programmatically set values
2. **File** - Values from .env or config files
3. **Process** - Environment variables
4. **Default** - Schema defaults

### Type System
8 types, each with validation rules:
- `string` - Any text
- `int` - Integer numbers
- `number` - Floating-point numbers
- `boolean` - true/false
- `enum` - Fixed set of choices
- `url` - HTTP/HTTPS URLs
- `json` - Structured JSON data
- `secret` - Passwords, tokens, keys (never logged)

---

## 🚀 Real-World Example

See **[REFERENCE_DEPLOYMENT.md](REFERENCE_DEPLOYMENT.md)** for complete details.

**Before TER:**
```
New engineer: "What config do I need?"
You: *points at code*
30 minutes of trial and error
Still missing something
```

**With TER:**
```
New engineer: "What config do I need?"
You: "Run `npx ter check` to see"
5 minutes, complete, nothing missing
```

---

## 💬 Questions?

See the documentation or open an issue on GitHub. This is RC1—your feedback shapes v1.0.

---

**TER: Environment Contracts for Production**

Configuration should be explicit, validated, and safe. v1.0.0-rc1 delivers exactly that.
