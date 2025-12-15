# RC1 Early Adopter Outreach

## Email Template

---

### Subject: TER v1.0.0-rc1: Environment Contracts for Production

Hi [Name],

**TER v1.0.0-rc1 is ready.** This is the first release candidate of the Typed Environment Runtime—a contract-driven environment validation platform for Node.js, Python, and Go.

If you've ever:
- Missed an environment variable and it broke prod
- Onboarded someone for 30 minutes explaining which env vars they need
- Struggled to audit what configuration actually ran
- Wanted to validate app configuration as a first-class CI/CD step

**TER solves this.**

---

## What's Included

**Production-ready code:**
- ✅ 348+ passing tests
- ✅ Zero dependencies
- ✅ 3 language SDKs with identical behavior
- ✅ Formal specification (implementable in any language)

**Proof it works:**
- ✅ Complete reference deployment (Express.js)
- ✅ Real CI/CD workflow example
- ✅ Multi-environment support (dev/staging/prod)
- ✅ Secret redaction and audit trails

---

## Try It (5 Minutes)

### Installation
```bash
npm install @blazeinstall/ter@rc1
# or
pip install ter-sdk
# or
go get github.com/ter-sdk/ter-go
```

### Define your contract (.ter.json)
```json
{
  "DATABASE_URL": { "type": "url", "required": true },
  "PORT": { "type": "int", "default": 3000 }
}
```

### Create .env
```
DATABASE_URL=postgres://localhost/mydb
PORT=3000
```

### Validate
```bash
npx ter check --env .env --contract .ter.json
# ✅ Valid
```

### Use in code
```typescript
import { Schema, Types, Environment } from 'ter';

const schema = new Schema();
schema.define('DATABASE_URL', Types.url().markRequired());
schema.define('PORT', Types.int().default(3000));

const env = new Environment(schema);
env.init();

const port = env.getInt('PORT'); // number, not string
```

See **[GOLDEN_PATH.md](docs/GOLDEN_PATH.md)** for the complete tutorial.

---

## What We Want From You

This is RC1. Your feedback shapes v1.0.0 (final).

**Please tell us:**

1. **Does the reference deployment work for you?**
   - Try: `examples/express-reference/`
   - Does it integrate cleanly with your CI/CD?

2. **Is the positioning clear?**
   - Read: [VISION.md](docs/VISION.md)
   - Does "environment contracts for infrastructure" resonate?
   - Is it different from dotenv in the way we describe?

3. **Are the 3 SDKs consistent?**
   - Try the same contract in Node/Python/Go
   - Does behavior match across languages?

4. **What would make this useful for your team?**
   - Missing features?
   - Better integrations?
   - Clearer documentation?

**How to give feedback:**
- Open an issue on GitHub (label: `rc1-feedback`)
- Reply to this email
- Slack/Discord (if community exists)

---

## Key Documents

| Document | Purpose |
|----------|---------|
| [VISION.md](docs/VISION.md) | Why this matters (10 min read) |
| [TER_SPEC_v1.md](docs/TER_SPEC_v1.md) | Formal specification (reference) |
| [GOLDEN_PATH.md](docs/GOLDEN_PATH.md) | Complete tutorial (5 min) |
| [REFERENCE_DEPLOYMENT.md](REFERENCE_DEPLOYMENT.md) | Express.js integration example |
| [RELEASE_NOTES.md](RELEASE_NOTES_v1.0.0-rc1.md) | Detailed feature list |
| [V1_SCOPE.md](V1_SCOPE.md) | What's in v1.0, what's deferred |

---

## Timeline

- **Now** - RC1 available for testing
- **Week 2-3** - RC1 feedback collection period
- **Week 3-4** - Incorporate feedback, prepare v1.0.0 final
- **January 2026** - v1.0.0 official launch

---

## Key Talking Points

### What This Is
"Environment contracts for infrastructure. A way to make configuration explicit, validated, and auditable."

### What This Is NOT
- Not replacing environment variables (they're still the mechanism)
- Not a secret manager (complements Vault, AWS Secrets, etc.)
- Not a convenience library (it's infrastructure)

### Why It Matters
- **Type safety** - Catch config errors at deploy time
- **Portability** - Same rules across Node/Python/Go
- **Auditability** - Proof of what configuration ran
- **AI-ready** - Claude can understand your config contracts

### Why v1.0 Is Real
- Production-ready code (348+ tests, zero deps)
- Formal specification (implementable in any language)
- Reference deployment (proves it works in practice)
- Multi-language parity (same behavior across 3 languages)

---

## FAQ

**Q: How is this different from dotenv?**
A: dotenv loads files. TER validates them against a contract. Use both: dotenv loads, TER validates.

**Q: Do I have to use .env files?**
A: No. TER reads from process env, injected values, or files. Mix and match.

**Q: How do secrets stay safe?**
A: Secrets are marked as such and never logged. Your values are safe.

**Q: Can I use TER in production?**
A: Yes. 100% test coverage, zero dependencies, formal specification.

**Q: Does TER support variable expansion (${VAR})?**
A: Not in v1.0 (simplified for launch). Planned for v1.1.

---

## Next Steps

1. **Try it** - Follow the 5-minute tutorial above
2. **Read VISION.md** - Understand the strategic positioning
3. **Review reference deployment** - See real-world integration
4. **Give feedback** - Open GitHub issue or reply to this email

---

## Contact

- GitHub: [https://github.com/Nom-nom-hub/TER](https://github.com/Nom-nom-hub/TER)
- Issues: [GitHub Issues](https://github.com/Nom-nom-hub/TER/issues) (label: rc1-feedback)
- Questions: Reply to this email

---

**TER v1.0.0-rc1**

Environment configuration is infrastructure. RC1 proves it.

---

*P.S.* - This is RC1, which means the code is production-ready but we're still gathering external validation. Your feedback on positioning, integrations, and real-world use cases is exactly what we need to finalize v1.0.0.
