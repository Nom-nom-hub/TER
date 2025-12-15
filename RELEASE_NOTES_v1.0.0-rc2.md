# TER v1.0.0-rc2 Release Notes

**Date**: December 15, 2025  
**Status**: Release Candidate (RC2)  
**Target**: v1.0.0 (Final) - January 2026

---

## Overview

TER v1.0.0-rc2 is a minor maintenance release focused on reducing npm package bloat. The core product remains unchanged from rc1; this release improves the installation experience for npm users.

---

## What Changed

### npm Package Optimization
- **Added `.npmignore`** to exclude unnecessary files from published npm package
- **Reduced package size** from 520 kB to 100 kB (80% reduction)
- **Excluded**: docs/, examples/, tests/, src/, language SDKs, benchmarks, planning documents
- **Included only**: dist/ (compiled code), package.json, README.md, LICENSE

### Package Contents (rc2)
```
✅ dist/                  - Compiled JavaScript + TypeScript definitions
✅ package.json           - Package metadata
✅ README.md              - User-facing documentation
✅ LICENSE                - MIT license
❌ src/                   - Source (users get compiled code)
❌ tests/                 - Tests excluded
❌ docs/                  - Documentation excluded (link to GitHub)
❌ examples/              - Examples excluded
❌ go/, python/, etc.     - Language SDKs excluded (not for npm)
❌ Planning documents     - Excluded (RC1_*, etc)
```

### Installation Impact
**Before (rc1)**: `npm install ter` → 520+ KB  
**After (rc2)**: `npm install ter` → 100 KB

Users installing from npm now get only what they need.

---

## No Code Changes

- Core runtime: **Identical to rc1**
- CLI: **Identical to rc1**
- SDKs (Node/Python/Go): **Identical to rc1**
- Tests: **348+ tests still passing**
- API: **No breaking changes**

This is purely a packaging fix for rc1.

---

## What's Included

### Core Runtime
- ✅ Complete type system (8 types: string, int, number, boolean, enum, url, json, secret)
- ✅ Schema definition and validation
- ✅ Multi-source resolution
- ✅ Type-safe getters with automatic coercion
- ✅ Secret redaction and safe value handling

### Language SDKs (in main repo, not npm)
- ✅ **Node.js** - Published to npm
- ✅ **Python** - Published to PyPI (separate package)
- ✅ **Go** - Published to GitHub (import directly)

### CLI Tools
- ✅ `ter check` - Validate environment against contract
- ✅ `ter explain VAR` - Show variable details
- ✅ `ter diff FILE1 FILE2` - Compare environments
- ✅ `ter graph` - Visualize inheritance
- ✅ `ter run -- COMMAND` - Execute with validation
- ✅ `ter init` - Generate template contract

### Integrations
- ✅ **Vault** - Full secret backend (multiple auth methods)
- ✅ **MCP** - Claude/AI integration via Model Context Protocol
- ✅ **JSON Schema Export** - Generate schemas for external tools
- ✅ **DotEnv Adapter** - Parse .env files with validation

---

## Installation

### From npm
```bash
npm install ter  # Now 100 KB instead of 520 KB
```

### From source (for development)
```bash
git clone https://github.com/Nom-nom-hub/TER.git
npm install
npm run build
```

---

## Testing rc2

### Test npm installation
```bash
npm install @blazeinstall/ter@1.0.0-rc2
```

Verify:
```bash
node -e "const TER = require('@blazeinstall/ter'); console.log(Object.keys(TER));"
```

### Test CLI
```bash
npx ter check --env .env
npx ter explain DATABASE_URL
```

---

## Comparison: rc1 vs rc2

| Aspect | rc1 | rc2 |
|--------|-----|-----|
| Core code | ✅ | ✅ Unchanged |
| Tests | ✅ 348+ | ✅ 348+ |
| npm package | ❌ 520 KB bloat | ✅ 100 KB clean |
| Installation speed | Slow | Fast |
| .npmignore | ❌ Missing | ✅ Added |
| API | ✅ Same | ✅ Same |

---

## Known Limitations

Same as rc1 (no changes to core):
- Variable expansion (`${VAR}` syntax) deferred to v1.1
- Ruby, Java, Rust SDKs planned for future releases
- 3 edge-case tests require investigation (non-blocking)

---

## What's Next

- **v1.0.0 (Final)** - January 2026
  - Incorporate feedback
  - Fix remaining edge cases
  - Official production launch

---

## Support & Resources

- **Installation Guide** → [README.md](README.md)
- **5-Minute Tutorial** → [GOLDEN_PATH.md](docs/GOLDEN_PATH.md)
- **Full Specification** → [TER_SPEC_v1.md](docs/TER_SPEC_v1.md)
- **Issues** → GitHub issues

---

**TER: Environment Contracts for Production**

Clean installation, production-ready configuration.

Version 1.0.0-rc2
