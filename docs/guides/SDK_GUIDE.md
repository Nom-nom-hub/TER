# TER Multi-Language SDK Guide

Typed Environment Runtime (TER) now provides SDKs in Node.js, Python, and Go with consistent APIs across all languages.

## Quick Start by Language

### Node.js SDK

```bash
npm install ter
```

```typescript
import { env } from 'ter';

const schema = env.define({
  PORT: env.types.int().default(3000),
  API_KEY: env.types.secret().markRequired()
});

const config = env.create(schema);
const port = config.getInt('PORT');
```

### Python SDK

```bash
cd python && pip install -e .
```

```python
from ter import Schema, Types, Resolver, Environment

schema = Schema()
schema.define("PORT", Types.int().default(3000))
schema.define("API_KEY", Types.secret().mark_required())

resolver = Resolver(schema)
env = Environment(schema, resolver)
port = env.get_int("PORT")
```

### Go SDK

```bash
go get github.com/ter-sdk/ter-go
```

```go
import "github.com/ter-sdk/ter-go/schema"
import "github.com/ter-sdk/ter-go/types"

s := schema.NewSchema()
s.Define("PORT", types.NewIntType().SetDefault(3000))
s.Define("API_KEY", types.NewSecretType().MarkRequired())
```

---

## API Reference

### Type System

All SDKs support 9 types with consistent semantics:

| Type | Node.js | Python | Go |
|------|---------|--------|-----|
| String | `string()` | `string()` | `NewStringType()` |
| Integer | `int()` | `int()` | `NewIntType()` |
| Number | `number()` | `number()` | `NewFloatType()` |
| Float | `float()` | `float()` | `NewFloatType()` |
| Boolean | `boolean()` | `boolean()` | `NewBoolType()` |
| Enum | `enum(values)` | `enum(values)` | `NewEnumType(values)` |
| URL | `url()` | `url()` | `NewURLType()` |
| JSON | `json()` | `json()` | `NewJSONType()` |
| Secret | `secret()` | `secret()` | `NewSecretType()` |

### Type Modifiers

#### Default Values
```typescript
// Node.js
env.types.int().default(3000)

// Python
Types.int().default(3000)

// Go
types.NewIntType().SetDefault(3000)
```

#### Required Fields
```typescript
// Node.js
env.types.string().markRequired()

// Python
Types.string().mark_required()

// Go
types.NewStringType().MarkRequired()
```

#### Constraints
```typescript
// Node.js - String
env.types.string().min(3).max(100).matches(/^[a-z]+$/)

// Python - String
Types.string().min(3).max(100).matches(r'^[a-z]+$')

// Go - String
types.NewStringType().Min(3).Max(100)
```

```typescript
// Node.js - Number
env.types.int().minimum(0).maximum(100)

// Python - Number
Types.int().minimum(0).maximum(100)

// Go - Number
types.NewIntType().Minimum(0).Maximum(100)
```

### Schema Definition

#### Node.js
```typescript
import { Schema, Types } from 'ter';

const schema = new Schema();
schema.define('PORT', Types.int().default(3000));
schema.define('API_KEY', Types.secret());
```

#### Python
```python
from ter import Schema, Types

schema = Schema()
schema.define("PORT", Types.int().default(3000))
schema.define("API_KEY", Types.secret())
```

#### Go
```go
import (
	"github.com/ter-sdk/ter-go/schema"
	"github.com/ter-sdk/ter-go/types"
)

s := schema.NewSchema()
s.Define("PORT", types.NewIntType().SetDefault(3000))
s.Define("API_KEY", types.NewSecretType())
```

### Environment Access

#### Node.js
```typescript
const env = new Environment(schema, values);

env.getString('API_KEY')      // string
env.getInt('PORT')            // number
env.getFloat('RATE')          // number
env.getBool('DEBUG')          // boolean
env.getJSON('CONFIG')         // any
env.getOptional('MISSING')    // any | undefined
env.getMetadata('API_KEY')    // { source, resolvedAt }
```

#### Python
```python
env = Environment(schema, resolver)

env.get_string("API_KEY")    # str
env.get_int("PORT")          # int
env.get_float("RATE")        # float
env.get_bool("DEBUG")        # bool
env.get_json("CONFIG")       # Any
env.get_optional("MISSING")  # Optional[Any]
env.get_metadata("API_KEY")  # Dict[str, Any]
```

#### Go
```go
env := runtime.NewEnvironment(s, resolver)

port, err := env.GetInt("PORT")       // (int, error)
rate, err := env.GetFloat("RATE")     // (float64, error)
debug, err := env.GetBool("DEBUG")    // (bool, error)
config, err := env.GetJSON("CONFIG")  // (interface{}, error)
metadata := env.GetMetadata("PORT")   // map[string]interface{}
```

### Validation

#### Node.js
```typescript
const schema = new Schema();
schema.define('PORT', Types.int());

const result = schema.validate({ PORT: '3000' });
// { PORT: 3000 }
```

#### Python
```python
schema = Schema()
schema.define("PORT", Types.int())

result = schema.validate({"PORT": "3000"})
# {"PORT": 3000}
```

#### Go
```go
s := schema.NewSchema()
s.Define("PORT", types.NewIntType())

values, err := s.Validate(map[string]interface{}{"PORT": "3000"})
// map[string]interface{}{"PORT": 3000}
```

### Multi-Source Resolution

All SDKs support 4-source priority resolution:

1. **Process Environment** (`process.env` / `os.Environ()`)
2. **File Environment** (from `.env` file)
3. **Injected** (programmatically provided)
4. **Defaults** (from schema definition)

#### Node.js
```typescript
const resolver = new Resolver(schema)
  .addFileEnv(parsedDotEnv)
  .addInjected({ API_KEY: 'override' });

const values = resolver.resolveAll();
```

#### Python
```python
resolver = Resolver(schema)
resolver.add_file_env(parsed_dotenv)
resolver.add_injected({"API_KEY": "override"})

values = resolver.resolve_all()
```

#### Go
```go
resolver := runtime.NewResolver(s)
resolver.AddFileEnv(parsedDotEnv)
resolver.AddInjected(map[string]string{"API_KEY": "override"})

values := resolver.ResolveAll()
```

### DotEnv Adapter

#### Node.js
```typescript
import { parseDotEnv, generateDotEnv, diffDotEnv } from 'ter';

// Parse
const env = parseDotEnv(fileContent);

// Generate
const output = generateDotEnv(values, { header: 'Production' });

// Diff
const changes = diffDotEnv(before, after);
// { added: {...}, removed: {...}, modified: {...} }
```

#### Python
```python
from ter.adapters import parse_dotenv, generate_dotenv, diff_dotenv

# Parse
result = parse_dotenv(file_content)
# ParseResult(valid, values, errors)

# Generate
output = generate_dotenv(values, header="Production")

# Diff
changes = diff_dotenv(before, after)
# {"added": {...}, "removed": {...}, "modified": {...}}
```

#### Go
```go
import "github.com/ter-sdk/ter-go/adapters"

// Parse
result := adapters.ParseDotenv(content)
// ParseResult{Valid, Values, Errors}

// Generate
output := adapters.GenerateDotenv(values, "Production")

// Diff
diff := adapters.DiffDotenv(before, after)
// DiffResult{Added, Removed, Modified}
```

---

## Complete Examples

### Example 1: Express.js Application (Node.js)

```typescript
import express from 'express';
import { env } from 'ter';
import { parseDotEnv } from 'ter/adapters/dotenv';
import fs from 'fs';

// Define schema
const schema = env.define({
  NODE_ENV: env.types.enum(['dev', 'prod']).default('dev'),
  PORT: env.types.int().default(3000),
  HOST: env.types.string().default('localhost'),
  DATABASE_URL: env.types.url().markRequired(),
  SESSION_SECRET: env.types.secret().markRequired()
});

// Load and validate
const dotenvContent = fs.readFileSync('.env', 'utf-8');
const fileEnv = parseDotEnv(dotenvContent).values;

const config = env.create(schema, { fileEnv });
const port = config.getInt('PORT');
const host = config.getString('HOST');
const dbUrl = config.getString('DATABASE_URL');

// Use in Express
const app = express();
app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});
```

### Example 2: FastAPI Application (Python)

```python
from fastapi import FastAPI
from ter import Schema, Types, Resolver, Environment
from ter.adapters.dotenv import parse_dotenv

# Define schema
schema = Schema()
schema.define("ENVIRONMENT", Types.enum(['development', 'production']).default('development'))
schema.define("PORT", Types.int().default(8000))
schema.define("HOST", Types.string().default('0.0.0.0'))
schema.define("DATABASE_URL", Types.url().mark_required())
schema.define("SECRET_KEY", Types.secret().mark_required())

# Load environment
with open('.env', 'r') as f:
    result = parse_dotenv(f.read())
    file_env = result.values

# Create environment
resolver = Resolver(schema)
resolver.add_file_env(file_env)
env = Environment(schema, resolver)

# Validate
try:
    env.validate()
except ValueError as e:
    print(f"Configuration error: {e}")
    exit(1)

# Use in FastAPI
app = FastAPI()

@app.get("/")
async def root():
    return {
        "port": env.get_int("PORT"),
        "environment": env.get_string("ENVIRONMENT")
    }
```

### Example 3: Go Web Service

```go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/ter-sdk/ter-go/adapters"
	"github.com/ter-sdk/ter-go/runtime"
	"github.com/ter-sdk/ter-go/schema"
	"github.com/ter-sdk/ter-go/types"
)

func main() {
	// Define schema
	s := schema.NewSchema()
	s.Define("PORT", types.NewIntType().SetDefault(3000))
	s.Define("DATABASE_URL", types.NewURLType().MarkRequired())
	s.Define("SECRET_KEY", types.NewSecretType().MarkRequired())

	// Load environment
	content, err := os.ReadFile(".env")
	if err != nil {
		log.Fatal(err)
	}

	result := adapters.ParseDotenv(string(content))
	if !result.Valid {
		for _, e := range result.Errors {
			log.Printf("Line %d: %s\n", e.Line, e.Message)
		}
		os.Exit(1)
	}

	// Create environment
	resolver := runtime.NewResolver(s)
	resolver.AddFileEnv(result.Values)
	env := runtime.NewEnvironment(s, resolver)

	// Validate
	_, err = env.Validate()
	if err != nil {
		log.Fatalf("Configuration error: %v\n", err)
	}

	// Get values
	port, _ := env.GetInt("PORT")
	dbURL, _ := env.GetString("DATABASE_URL")

	// Start server
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello from TER!"))
	})

	log.Printf("Server listening on port %d\n", port)
	log.Fatal(http.ListenAndServe(":"+string(rune(port)), nil))
}
```

---

## Common Patterns

### Environment-Specific Configuration

```typescript
// Node.js
const env = process.env.NODE_ENV || 'development';
const config = env.create(schema, {
  fileEnv: loadEnvFile(`.env.${env}`)
});
```

```python
# Python
import os
environment = os.getenv("ENVIRONMENT", "development")
with open(f".env.{environment}") as f:
    file_env = parse_dotenv(f.read()).values
resolver.add_file_env(file_env)
```

### Merging Multiple Sources

```typescript
// Node.js
const resolver = new Resolver(schema)
  .addFileEnv(parseDotEnv('.env').values)
  .addFileEnv(parseDotEnv('.env.local').values)
  .addInjected(process.env);
```

```python
# Python
from ter.adapters import merge_dotenv, parse_dotenv

env1 = parse_dotenv(open('.env').read()).values
env2 = parse_dotenv(open('.env.local').read()).values
merged = merge_dotenv(env1, env2)

resolver.add_file_env(merged)
```

### Schema from Template

```typescript
// Node.js
import template from './templates/postgresql.json';
const schema = Schema.fromDict(template);
```

```python
# Python
import json
with open("templates/postgresql.json") as f:
    template = json.load(f)
schema = Schema.from_dict(template)
```

---

## Migration Guide

### From .env to TER

1. **Create Contract** - Define schema using TER types
2. **Validate** - Check existing `.env` against schema
3. **Deploy** - Use TER in application
4. **Monitor** - Use diagnostics for any issues

### From Other Validation Systems

TER provides:
- **Typed** - 9 built-in types
- **Composable** - Mix and match, extend
- **Multi-language** - Use across tech stack
- **Self-documenting** - JSON schema export
- **Zero dependencies** - No runtime bloat

---

## Best Practices

### Security

- Mark sensitive data with `secret()` type
- Never log secrets (TER redacts automatically)
- Use environment injection for sensitive values
- Validate secrets are provided at startup

### Performance

- Define schema once, reuse everywhere
- Cache validation results
- Use lazy resolution when possible
- Avoid repeated parsing of same files

### Maintainability

- Use templates for common patterns
- Document variable purpose in descriptions
- Keep schema and code in sync
- Version your schemas

### Testing

- Use injected values in tests
- Mock environment sources
- Test validation error cases
- Verify secret handling

---

## Troubleshooting

### "Variable is required"
Ensure the variable is provided in one of:
- Process environment: `export VAR=value`
- `.env` file: `VAR=value`
- Injected: `resolver.addInjected({VAR: value})`
- Schema default: `Types.int().default(value)`

### "Not a valid URL"
Check URL format starts with `http://` or `https://`

### "Not a valid JSON"
Ensure JSON is properly quoted in `.env`:
```bash
CONFIG='{"key":"value"}'  # Correct
CONFIG={"key":"value"}    # Incorrect
```

### "Type mismatch"
Provide value in correct type:
```bash
PORT=3000        # ✅ Integer
PORT="3000"      # ✅ Coerced to integer
PORT=abc         # ❌ Error
```

---

## SDK Comparison

| Feature | Node.js | Python | Go |
|---------|---------|--------|-----|
| Types | 9 | 9 | 9 |
| Validation | ✅ | ✅ | ✅ |
| Multi-source | ✅ | ✅ | ✅ |
| DotEnv | ✅ | ✅ | ✅ |
| Type hints | ✅ | ✅ | ✅ |
| Dependencies | 0 | 0 | 0 |
| Performance | ⚡⚡⚡ | ⚡⚡ | ⚡⚡⚡ |
| Async Ready | ✅ | ✅ | ✅ |

---

## Contributing

To contribute to TER SDKs:

1. Follow the established API patterns
2. Maintain zero dependencies
3. Include comprehensive tests
4. Document with examples
5. Update this guide

---

**Last Updated**: 2025-12-15  
**SDKs**: 3 (Node.js, Python, Go)  
**Types**: 9  
**Templates**: 7
