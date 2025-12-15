# TER Usage Examples

## Basic Schema Definition

```typescript
import { env } from 'ter';

const contract = env.define({
  DATABASE_URL: env.types.url().markRequired(),
  PORT: env.types.int().default(3000),
  NODE_ENV: env.types.enum(['dev', 'staging', 'prod']).default('dev'),
  API_KEY: env.types.secret().markRequired(),
  ENABLE_LOGGING: env.types.boolean().default(true),
  MAX_CONNECTIONS: env.types.int().minimum(1).maximum(100),
});

const environment = env.create(contract);

// Type-safe access
const port = environment.getInt('PORT');           // number
const dbUrl = environment.getString('DATABASE_URL'); // string
const isLogging = environment.getBoolean('ENABLE_LOGGING'); // boolean

// Optional access
const apiKey = environment.getOptional<string>('API_KEY');
```

## Validation & Error Handling

```typescript
const validation = environment.validate();

if (!validation.valid) {
  console.error('Config errors:');
  for (const error of validation.errors) {
    console.error(`  ${error.variable}: ${error.error}`);
  }
  process.exit(1);
}

console.log('Config is valid!');
```

## Secret Handling

Secrets are automatically redacted in logs and inspection:

```typescript
// Safe inspection - secrets are hidden
const safeValues = environment.getAllValues(true);
console.log(safeValues);
// {
//   DATABASE_URL: 'postgres://...',
//   API_KEY: '[SECRET]'      <-- Hidden
// }

// Check if a value is secret
if (environment.isSecret('API_KEY')) {
  console.log('API_KEY is secret, be careful with logging');
}
```

## Environment with .env File

Create `.env`:
```
DATABASE_URL=postgres://localhost/mydb
PORT=5432
NODE_ENV=development
API_KEY=sk-1234567890
```

Use in code:
```typescript
import * as fs from 'fs';

function parseDotEnv(path: string) {
  const content = fs.readFileSync(path, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [key, ...rest] = line.split('=');
    env[key.trim()] = rest.join('=').trim();
  }
  return env;
}

const dotenvValues = parseDotEnv('.env');
const environment = env.create(contract, { fileEnv: dotenvValues });
```

## Contract File Format

TER contracts are JSON with full type information:

```json
{
  "version": "1.0",
  "variables": [
    {
      "name": "DATABASE_URL",
      "type": "url",
      "required": true,
      "isSecret": false,
      "description": "Database connection string"
    },
    {
      "name": "PORT",
      "type": "int",
      "required": false,
      "defaultValue": 3000,
      "isSecret": false
    },
    {
      "name": "API_KEY",
      "type": "secret",
      "required": true,
      "isSecret": true,
      "policy": {
        "visibility": "secret"
      }
    }
  ]
}
```

## CLI Usage

### Initialize a contract

```bash
ter init --contract .ter.json
```

Creates `.ter.json` with template schema.

### Check environment

```bash
ter check --contract .ter.json --env .env
```

Output:
```
✓ Environment is valid

Resolved variables:
  DATABASE_URL: postgres://localhost/db (from file)
  PORT: 3000 (from default)
  NODE_ENV: development (from file)
  API_KEY: [SECRET] (from file)
```

If invalid:
```
✗ Environment validation failed:

  API_KEY: Value is required
  PORT: "abc" is not a valid integer
```

## Type Constraints

### String Constraints

```typescript
env.types.string()
  .min(3)                    // Minimum length
  .max(255)                  // Maximum length
  .matches(/^[a-z]+$/)       // Regex pattern
  .default('default')        // Default value
  .markRequired()            // Must be present
```

### Number Constraints

```typescript
env.types.int()
  .minimum(1)                // Minimum value
  .maximum(100)              // Maximum value
  .default(50)               // Default value
  .markRequired()            // Must be present
```

### Enum Values

```typescript
env.types.enum(['dev', 'staging', 'prod'])
  .default('dev')            // Default value
  .markRequired()            // Must be present
```

## Metadata & Provenance

```typescript
// See where a value came from
const metadata = environment.getMetadata('DATABASE_URL');
console.log(metadata);
// {
//   source: 'file',
//   resolvedAt: Date,
//   sourceLocation: '.env'
// }

// Get all resolved values with metadata
const resolved = environment.getResolved();
for (const item of resolved) {
  console.log(`${item.name}: from ${item.metadata.source}`);
}
```

## Error Types

```typescript
// Type validation errors
const type = env.types.url();
const result = type.validate('not-a-url');
// {
//   valid: false,
//   error: {
//     field: 'SOME_URL',
//     value: 'not-a-url',
//     expected: 'valid URL',
//     reason: '"not-a-url" is not a valid URL'
//   }
// }
```

## JSON Type

```typescript
const schema = env.define({
  CONFIG_JSON: env.types.json(),
});

// Automatically parses and validates JSON
const config = environment.getJSON('CONFIG_JSON');
// If CONFIG_JSON='{"key": "value"}', config is { key: 'value' }
```

## Chaining & Fluent API

```typescript
const schema = env.define({
  CACHE_TIMEOUT: env.types.int()
    .minimum(1)
    .maximum(3600)
    .default(300),
    
  FEATURE_FLAGS: env.types.json()
    .default({})
    .markRequired(),
    
  LOG_LEVEL: env.types.enum(['debug', 'info', 'warn', 'error'])
    .default('info'),
});
```
