# RC1 Release Action Plan
**Status**: Ready for Immediate Execution  
**Date**: December 15, 2025  
**Target**: Complete RC1 release this week

---

## Phase 1: Version Updates (IMMEDIATE - Today)

### Tasks
- [ ] Update package.json: 0.1.0 → 1.0.0-rc1
- [ ] Update python/setup.py: 0.1.0 → 1.0.0-rc1
- [ ] Update Go module version in documentation/tags
- [ ] Commit version updates: `git commit -m "chore: bump version to 1.0.0-rc1"`
- [ ] Create GitHub Release page with RELEASE_NOTES_v1.0.0-rc1.md content

### Status
- ✅ v1.0.0-rc1 git tag exists
- ✅ Build passing (zero TypeScript errors)
- ❌ Package versions still at 0.1.0 (NEEDS UPDATE)
- ❌ GitHub Release page not created yet

---

## Phase 2: Package Publishing (After Version Updates)

### npm (Node.js)
- [ ] Verify npm registry access: `npm whoami`
- [ ] Test publish to dry-run: `npm publish --dry-run`
- [ ] Publish to npm: `npm publish --tag rc` (or `--tag rc1`)
- [ ] Verify on npm registry: https://www.npmjs.com/package/ter

### PyPI (Python)
- [ ] Verify setup.py version updated to 1.0.0-rc1
- [ ] Build dist: `python setup.py sdist bdist_wheel`
- [ ] Test upload: `twine upload --repository-url https://test.pypi.org/legacy/ dist/*`
- [ ] Publish: `twine upload dist/*`
- [ ] Verify on PyPI: https://pypi.org/project/ter-sdk/

### Go
- [ ] Verify go.mod version in documentation
- [ ] Tag Go module: `git tag go/v1.0.0-rc1`
- [ ] Go modules are version-managed via git tags (no separate publish)
- [ ] Update documentation to reference v1.0.0-rc1

---

## Phase 3: Announcement & Outreach (After Publishing)

### GitHub Release
- [ ] Draft release using RELEASE_NOTES_v1.0.0-rc1.md
- [ ] Include:
  - Key achievements (348+ tests, zero deps, 3 SDKs)
  - Strategic repositioning (environment contracts for infrastructure)
  - Known limitations (3 edge-case tests, documented)
  - Installation instructions
  - Link to reference deployment example
  - Call for feedback

### Early Adopter Outreach
- [ ] Draft email to selected early adopters with:
  - Reference deployment link (express-reference/)
  - RELEASE_NOTES_v1.0.0-rc1.md
  - GOLDEN_PATH.md for quick start
  - Feedback collection form/channel
  
### Public Announcement (Optional)
- [ ] Hacker News post (optional, can skip for rc1)
- [ ] Reddit r/programming (optional, can skip for rc1)
- [ ] Dev.to post (optional, can skip for rc1)

---

## Phase 4: RC1 Feedback Collection (Week 2-3)

### Feedback Channels
- [ ] GitHub issues (tagged rc1-feedback)
- [ ] Email responses from early adopters
- [ ] Discord/Slack community (if exists)
- [ ] Reference deployment testing reports

### Triage Process
- [ ] **RC1-blocking**: Core runtime issues, spec violations, critical bugs
- [ ] **v1.0-final**: Documentation improvements, messaging refinements
- [ ] **v1.1+**: Feature requests deferred per V1_SCOPE.md

### Documentation of Feedback
- [ ] Create RC1_FEEDBACK.md with:
  - Feedback categories
  - Early adopter quotes
  - Lessons learned
  - Changes for v1.0.0 final

---

## Phase 5: v1.0.0 Final Preparation (Week 3-4)

### Code Changes (if any)
- [ ] Incorporate blocking RC1 feedback
- [ ] Fix critical bugs identified in RC1
- [ ] Re-run full test suite (348+ tests)
- [ ] Update CHANGELOG with RC1 feedback incorporated

### Documentation Polish
- [ ] Messaging refinements based on feedback
- [ ] Update examples with any API clarifications
- [ ] Final review of all strategic documents
- [ ] Verify all links work

### Version & Publishing
- [ ] Update versions to 1.0.0
- [ ] Update package descriptions/keywords
- [ ] Publish to all registries (npm, PyPI, Go)
- [ ] Create v1.0.0 GitHub Release
- [ ] Tag: `git tag -a v1.0.0 -m "TER v1.0.0: Environment Contracts for Production"`

---

## Verification Checklist

### Before Publishing
- [ ] Build passes: `npm run build` (zero errors)
- [ ] Tests passing: `npm test` (348+)
- [ ] No uncommitted changes
- [ ] Version numbers consistent across all SDKs
- [ ] README links are correct
- [ ] GOLDEN_PATH.md is actually 5 minutes

### After Publishing
- [ ] npm package shows v1.0.0-rc1
- [ ] PyPI package shows 1.0.0-rc1
- [ ] GitHub Release page live
- [ ] Documentation links to release
- [ ] Reference deployment examples work

---

## Success Criteria for RC1

### Technical ✅
- [x] Build passing
- [x] 348+ tests passing
- [x] Zero dependencies
- [x] Code complete and frozen

### Marketing ✅
- [x] VISION.md (strategic positioning)
- [x] TER_SPEC_v1.md (formal specification)
- [x] V1_SCOPE.md (scope lock)
- [x] REFERENCE_DEPLOYMENT.md (proof of concept)
- [x] RELEASE_NOTES_v1.0.0-rc1.md (announcement)

### Publishing (IN PROGRESS)
- [ ] Versions updated in all packages
- [ ] npm package published
- [ ] PyPI package published
- [ ] GitHub Release created
- [ ] Early adopters notified

### Feedback Period (WEEK 2-3)
- [ ] Collect RC1 feedback from real users
- [ ] Triage blocking vs non-blocking issues
- [ ] Document learnings

### v1.0.0 Final (WEEK 3-4)
- [ ] Incorporate RC1 feedback
- [ ] Publish v1.0.0
- [ ] Official launch announcement

---

## Communication Template

### For Early Adopters
```
Subject: TER v1.0.0-rc1 Now Available

TER v1.0.0-rc1 is ready for testing. This is the first release candidate of the 
Typed Environment Runtime—environment contracts for infrastructure.

Key deliverables:
- Production-ready code (348+ tests, zero dependencies)
- 3 language SDKs (Node.js, Python, Go) with identical behavior
- Formal specification (implementable, stable)
- Reference deployment example (Express.js with real CI/CD integration)

What to do:
1. Try GOLDEN_PATH.md (5-minute tutorial)
2. Review reference deployment in examples/express-reference/
3. Give feedback on VISION.md positioning
4. Test with your application

Target: v1.0.0 final in January 2026

Learn more: [docs/VISION.md, RELEASE_NOTES, GOLDEN_PATH]
```

### For GitHub Release
```
TER v1.0.0-rc1: Environment Contracts for Infrastructure

This is the first release candidate of TER, a contract-driven environment 
validation platform for Node.js, Python, and Go.

**What's Included**
- Core type system (8 types: string, int, number, boolean, enum, url, json, secret)
- 3 production SDKs with 100% parity
- CLI tools (check, explain, diff, graph, run, init)
- Vault secrets backend
- MCP integration for AI orchestration
- 348+ passing tests
- Zero production dependencies

**Try It**
```bash
npm install ter
npx ter init  # Generate template
npx ter check # Validate your environment
```

**Next Steps**
- Read GOLDEN_PATH.md for 5-minute tutorial
- See examples/express-reference/ for real-world integration
- Report issues on GitHub

**Status**: Release candidate (feedback period: 2-3 weeks)
Target v1.0.0 final: January 2026
```

---

## Timeline

| Task | When | Owner |
|------|------|-------|
| Update versions | Today | @me |
| Commit & verify | Today | @me |
| Publish npm/PyPI | Today/Tomorrow | @me |
| Create GitHub Release | Today/Tomorrow | @me |
| Early adopter outreach | Tomorrow | @me |
| RC1 feedback collection | Week 2-3 | Community |
| v1.0.0 final prep | Week 3 | @me |
| v1.0.0 launch | Week 4 | @me |

---

## Next Immediate Step

**1. Update package versions to 1.0.0-rc1**
- [ ] package.json (Node)
- [ ] setup.py (Python)
- [ ] Document Go version update path
- [ ] Commit: `git commit -m "chore: bump versions to 1.0.0-rc1"`

This unlocks all subsequent release tasks.
