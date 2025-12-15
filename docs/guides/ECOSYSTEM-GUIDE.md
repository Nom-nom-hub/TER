# TER Ecosystem Guide

Complete guide to TER's extensibility and integration features.

---

## Plugin System

### Quick Start

```typescript
import {
  PluginRegistry,
  PluginMarketplace,
  TERPlugin,
  getGlobalRegistry
} from 'ter/core/plugins';

// Create a custom plugin
const myPlugin: TERPlugin = {
  name: "custom-validators",
  version: "1.0.0",
  description: "Domain-specific validators",
  hooks: {
    onLoad: async () => console.log("Plugin loaded"),
    onEnable: async () => console.log("Plugin enabled"),
  },
  validators: {
    isPhoneNumber: (value) => /^\d{10}$/.test(value),
    isZipCode: (value) => /^\d{5}(-\d{4})?$/.test(value),
  },
  types: {
    phone: () => new StringType().custom((v) => {
      if (!/^\d{10}$/.test(v)) throw new Error("Invalid phone");
      return v;
    }),
  },
};

// Register globally
const registry = getGlobalRegistry();
await registry.register(myPlugin);

// Use custom validator
const validator = registry.getValidator("custom-validators", "isPhoneNumber");
```

### Plugin Registry API

```typescript
// Registration
await registry.register(plugin);
await registry.unregister(pluginName);
await registry.enable(pluginName);
await registry.disable(pluginName);

// Discovery
registry.getPlugin(name);
registry.isLoaded(name);
registry.getPlugins();
registry.getLoadOrder();

// Custom Assets
registry.getType(pluginName, typeName);
registry.getValidator(pluginName, validatorName);
registry.getBackend(pluginName, backendName);
registry.listTypes();
registry.listValidators();
registry.listBackends();

// Marketplace
marketplace.search("validator", { tags: ["validation"] });
marketplace.getFeatured();
marketplace.getTrending();
marketplace.getPlugin(id);
```

### Creating Custom Validators Plugin

```typescript
const validatorsPlugin: TERPlugin = {
  name: "email-validators",
  version: "1.0.0",
  description: "Email validation rules",
  validators: {
    emailFormat: (value) => {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(value as string);
    },
    allowedDomains: (value, context) => {
      const allowed = ["example.com", "company.com"];
      const domain = (value as string).split("@")[1];
      return allowed.includes(domain);
    },
  },
};
```

### Creating Custom Types Plugin

```typescript
const customTypesPlugin: TERPlugin = {
  name: "domain-types",
  version: "1.0.0",
  description: "Domain-specific types",
  types: {
    uuid: () => new StringType()
      .pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
      .default("00000000-0000-0000-0000-000000000000"),
    
    semver: () => new StringType()
      .pattern(/^\d+\.\d+\.\d+/)
      .default("0.0.0"),
  },
};
```

---

## CI/CD Integrations

### Quick Start

```typescript
import {
  detectCI,
  CIReporter,
  GitHubActionsHelper,
  GitLabCIHelper,
} from 'ter/integrations/ci-cd';

// Auto-detect CI environment
const ci = detectCI();
console.log(ci.platform); // "github" | "gitlab" | "jenkins" | ...
console.log(ci.branch);
console.log(ci.commit);

// Universal reporting
const reporter = new CIReporter();
reporter.reportValidationResults(isValid, errors, warnings);
```

### GitHub Actions

```typescript
import { GitHubActionsHelper } from 'ter/integrations/ci-cd';

// Set output for next step
GitHubActionsHelper.setOutput("validated", "true");

// Add annotations to PR
GitHubActionsHelper.annotation("error", "Missing DATABASE_URL", {
  file: ".env.example",
  line: 5,
  title: "Configuration Error",
});

// Add summary section
GitHubActionsHelper.addSummary(
  "Environment Validation",
  "✅ All variables validated successfully"
);

// Add summary table
GitHubActionsHelper.addSummaryTable(
  "Variables",
  ["Name", "Type", "Status"],
  [
    ["DATABASE_URL", "string", "✅"],
    ["API_KEY", "secret", "✅"],
  ]
);

// Notice/warning/error
GitHubActionsHelper.notice("Validation complete");
GitHubActionsHelper.warning("Using default timeout");
GitHubActionsHelper.error("Invalid port number");
```

### GitLab CI

```typescript
import { GitLabCIHelper } from 'ter/integrations/ci-cd';

GitLabCIHelper.addMetric("validation_time_ms", 1250);
GitLabCIHelper.createReport("validation", "report.json", "junit");
GitLabCIHelper.setVariable("VALIDATED", "true", true); // masked
```

### Jenkins

```typescript
import { JenkinsHelper } from 'ter/integrations/ci-cd';

JenkinsHelper.markUnstable();
JenkinsHelper.markFailed();
JenkinsHelper.publishReport("dist/report.html", "Validation Report");
```

### CircleCI

```typescript
import { CircleCIHelper } from 'ter/integrations/ci-cd';

CircleCIHelper.setEnv("VALIDATED", "true");
CircleCIHelper.storeArtifact("dist/report.json", "/artifacts");
CircleCIHelper.storeTestResults("test-results.xml");
CircleCIHelper.storeCoverage("coverage/lcov.info");
```

### Azure Pipelines

```typescript
import { AzurePipelinesHelper } from 'ter/integrations/ci-cd';

AzurePipelinesHelper.setVariable("VALIDATED", "true");
AzurePipelinesHelper.logIssue("error", "Validation failed");
AzurePipelinesHelper.addSummary("Results", "✅ All variables valid");
```

### GitHub Actions Workflow

Included at `.github/workflows/ter-validate.yml`:

```yaml
name: TER Environment Validation

on:
  push:
    branches: [main, develop]
    paths: ['.env*', '.ter.json', '**.ts']
  pull_request:
    branches: [main, develop]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run ter:check
      - if: always()
        run: npm run ter:report
```

---

## Community Template Registry

### Quick Start

```typescript
import {
  TemplateRegistry,
  TemplateValidator,
  TemplateIO,
  Template,
} from 'ter/registry/template-registry';

const registry = new TemplateRegistry();

// Register a template
registry.registerTemplate({
  metadata: {
    id: "web-app-starter",
    name: "Web App Starter",
    version: "1.0.0",
    author: "TER Team",
    description: "Template for web applications",
    tags: ["web", "starter"],
    category: "web",
    downloads: 0,
    rating: 5.0,
    verified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  contract: {
    DATABASE_URL: { type: "string", required: true },
    API_PORT: { type: "number", default: 3000 },
    LOG_LEVEL: { type: "enum", enum: ["debug", "info", "warn", "error"] },
  },
  documentation: "# Web App Configuration\n\n...",
  examples: {
    development: {
      DATABASE_URL: "postgres://localhost/dev",
      API_PORT: 3000,
      LOG_LEVEL: "debug",
    },
    production: {
      DATABASE_URL: "postgres://prod.example.com/app",
      API_PORT: 8080,
      LOG_LEVEL: "error",
    },
  },
});

// Search templates
const results = registry.search("web", {
  category: "web",
  tags: ["starter"],
  verified: true,
  minRating: 4.5,
});

// Get collections
registry.getFeatured(10);     // High rating + verified
registry.getTrending(10);     // Most downloads
registry.getNew(10);          // Most recent
registry.getByCategory("web");
registry.getByAuthor("TER Team");

// Review system
registry.addReview({
  id: "review-1",
  templateId: "web-app-starter",
  author: "user123",
  rating: 5,
  comment: "Excellent template!",
  verified: true,
  createdAt: new Date().toISOString(),
});

// Download tracking
registry.recordDownload("web-app-starter");

// Community submissions
const submissionId = registry.submitTemplate({
  id: "new-template",
  name: "My Template",
  author: "contributor",
  email: "contrib@example.com",
  description: "My custom template",
  contract: { VAR: { type: "string" } },
  examples: { default: { VAR: "value" } },
  documentation: "# Doc",
  license: "MIT",
  status: "pending",
  submittedAt: new Date().toISOString(),
});

// Approve/reject
registry.approveSubmission(submissionId, "reviewer");
registry.rejectSubmission(submissionId, "reviewer", "Missing examples");

// Statistics
const stats = registry.getStats();
// {
//   totalTemplates: 15,
//   totalDownloads: 5000,
//   categories: 3,
//   avgRating: 4.5,
//   verifiedCount: 12,
//   submissions: { pending: 2, approved: 10, rejected: 1 }
// }
```

### Template Validation

```typescript
import { TemplateValidator } from 'ter/registry/template-registry';

// Validate contract structure
const contractResult = TemplateValidator.validateContract({
  DATABASE_URL: { type: "string", required: true },
});
// { valid: true, errors: [] }

// Validate examples match contract
const examplesResult = TemplateValidator.validateExamples(
  contract,
  examples
);

// Validate documentation
const docResult = TemplateValidator.validateDocumentation(
  "# My Template\n\nExample usage: ..."
);
// { valid: true, warnings: [] }
```

### Template I/O

```typescript
import { TemplateIO } from 'ter/registry/template-registry';

// Export single template
TemplateIO.exportTemplate(template, "my-template.json");

// Import template
const imported = TemplateIO.importTemplate("my-template.json");

// Export entire registry
TemplateIO.exportRegistry(registry, "registry-backup.json");

// Export as package
TemplateIO.exportAsPackage(template, "template-package.json");
```

---

## Integration Examples

### Custom Validator Plugin + GitHub Actions

```typescript
// 1. Create validator plugin
const dbValidatorsPlugin: TERPlugin = {
  name: "database-validators",
  version: "1.0.0",
  validators: {
    connectionString: async (value) => {
      try {
        await testDatabaseConnection(value as string);
        return true;
      } catch (e) {
        return false;
      }
    },
  },
};

// 2. Register and use
await registry.register(dbValidatorsPlugin);

// 3. In GitHub Actions workflow
const reporter = new CIReporter("github");
try {
  validator(envVars.DATABASE_URL);
  reporter.reportSuccess("Database connection valid");
} catch (e) {
  reporter.reportError(`Database error: ${e.message}`);
}
```

### Template Registry + CI/CD Feedback

```typescript
// 1. Register templates
const registry = new TemplateRegistry();
registry.registerTemplate(myTemplate);

// 2. Track usage
registry.recordDownload("my-template");

// 3. Report in CI
const reporter = new CIReporter();
const stats = registry.getStats();
GitHubActionsHelper.addSummaryTable(
  "Template Registry Stats",
  ["Metric", "Value"],
  [
    ["Total Templates", stats.totalTemplates.toString()],
    ["Total Downloads", stats.totalDownloads.toString()],
    ["Avg Rating", stats.avgRating.toString()],
  ]
);
```

---

## Best Practices

### Plugin Development
- Always provide meaningful plugin names and versions
- Implement lifecycle hooks for setup/teardown
- Use TypeScript for type safety
- Add comprehensive JSDoc comments
- Test thoroughly before publishing

### CI/CD Integration
- Detect CI platform early in build process
- Use platform-specific helpers for consistency
- Provide clear success/failure messaging
- Generate human-readable reports
- Test with actual CI environments

### Template Management
- Include comprehensive documentation with examples
- Validate contracts before submitting
- Provide multiple example configurations
- Use meaningful categories and tags
- Encourage community contributions

---

## References

- **Plugins**: `src/core/plugins.ts` (650 lines)
- **CI/CD**: `src/integrations/ci-cd.ts` (500 lines)
- **Templates**: `src/registry/template-registry.ts` (700 lines)
- **Tests**: `tests/plugins.test.ts`, `tests/ci-cd.test.ts`, `tests/template-registry.test.ts`

---

**Last Updated**: 2025-12-15  
**Status**: Production Ready
