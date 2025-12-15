# TER Integration Guide

Complete guide for integrating Typed Environment Runtime (TER) into your applications.

## Table of Contents

1. [Framework Integrations](#framework-integrations)
2. [Language SDKs](#language-sdks)
3. [Deployment Patterns](#deployment-patterns)
4. [Best Practices](#best-practices)
5. [Troubleshooting](#troubleshooting)

---

## Framework Integrations

### Express.js / Node.js

#### Basic Setup

```typescript
import express from 'express';
import { env } from 'ter';
import fs from 'fs';
import { parseDotEnv } from 'ter/adapters/dotenv';

// 1. Define schema
const schema = env.define({
  NODE_ENV: env.types.enum(['development', 'production']).default('development'),
  PORT: env.types.int().default(3000),
  DATABASE_URL: env.types.url().markRequired(),
  SESSION_SECRET: env.types.secret().markRequired(),
  LOG_LEVEL: env.types.enum(['debug', 'info', 'warn', 'error']).default('info')
});

// 2. Load configuration
const dotenvContent = fs.readFileSync('.env', 'utf-8');
const fileEnv = parseDotEnv(dotenvContent).values;
const config = env.create(schema, { fileEnv });

// 3. Validate
try {
  config.validate();
  console.log('✓ Configuration valid');
} catch (error) {
  console.error('Configuration error:', error);
  process.exit(1);
}

// 4. Use in app
const app = express();

app.listen(config.getInt('PORT'), () => {
  console.log(`Server running on port ${config.getInt('PORT')}`);
});
```

#### Middleware Integration

```typescript
// Attach config to request
app.use((req, res, next) => {
  (req as any).config = config;
  next();
});

// Use in routes
app.get('/api/status', (req, res) => {
  res.json({
    environment: req.config.getString('NODE_ENV'),
    version: process.env.npm_package_version
  });
});
```

#### Error Handling

```typescript
// Centralized error handler with config
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const logLevel = config.getString('LOG_LEVEL');
  
  if (logLevel !== 'error') {
    console.error(err);
  }
  
  res.status(500).json({ error: 'Internal server error' });
});
```

---

### Next.js

#### Server-Side Configuration

```typescript
// lib/config.ts
import { Schema, Types, Resolver, Environment } from 'ter';
import { readFileSync } from 'fs';
import { parseDotEnv } from 'ter/adapters/dotenv';

const schema = new Schema();
schema.define('NEXT_PUBLIC_API_URL', Types.url().mark_required());
schema.define('API_URL', Types.url().mark_required());
schema.define('DATABASE_URL', Types.url().mark_required());
schema.define('JWT_SECRET', Types.secret().mark_required());
schema.define('NODE_ENV', Types.enum(['development', 'production']));

const envContent = readFileSync('.env.local', 'utf-8');
const fileEnv = parseDotEnv(envContent).values;

const resolver = new Resolver(schema);
resolver.add_file_env(fileEnv);

export const config = new Environment(schema, resolver);
```

#### API Route Integration

```typescript
// pages/api/config.ts
import { config } from '@/lib/config';

export default function handler(req, res) {
  try {
    res.json({
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      environment: config.get_string('NODE_ENV')
    });
  } catch (error) {
    res.status(500).json({ error: 'Configuration error' });
  }
}
```

#### Client-Side Configuration

```typescript
// Expose only public variables to client
export const publicConfig = {
  API_URL: process.env.NEXT_PUBLIC_API_URL
};
```

---

### FastAPI (Python)

```python
from fastapi import FastAPI
from ter import Schema, Types, Resolver, Environment
from ter.adapters.dotenv import parse_dotenv
from functools import lru_cache

# Define schema
schema = Schema()
schema.define("ENVIRONMENT", Types.enum(['development', 'production']).default('development'))
schema.define("HOST", Types.string().default("0.0.0.0"))
schema.define("PORT", Types.int().default(8000))
schema.define("DATABASE_URL", Types.url().mark_required())
schema.define("SECRET_KEY", Types.secret().mark_required())

# Load and validate
@lru_cache()
def get_config():
    with open('.env', 'r') as f:
        result = parse_dotenv(f.read())
    
    resolver = Resolver(schema)
    resolver.add_file_env(result.values)
    env = Environment(schema, resolver)
    
    env.validate()
    return env

app = FastAPI()
config = get_config()

@app.get("/")
async def root():
    return {
        "environment": config.get_string("ENVIRONMENT"),
        "port": config.get_int("PORT")
    }

if __name__ == "__main__":
    import uvicorn
    port = config.get_int("PORT")
    host = config.get_string("HOST")
    uvicorn.run(app, host=host, port=port)
```

---

### Django

```python
# settings.py
from ter import Schema, Types, Resolver, Environment
from ter.adapters.dotenv import parse_dotenv
import os

# Define schema
SCHEMA = Schema()
SCHEMA.define("DEBUG", Types.boolean().default(False))
SCHEMA.define("SECRET_KEY", Types.secret().mark_required())
SCHEMA.define("DATABASE_URL", Types.url().mark_required())
SCHEMA.define("ALLOWED_HOSTS", Types.json().default(["localhost", "127.0.0.1"]))

# Load configuration
with open('.env', 'r') as f:
    result = parse_dotenv(f.read())

resolver = Resolver(SCHEMA)
resolver.add_file_env(result.values)
env = Environment(SCHEMA, resolver)

# Use in settings
DEBUG = env.get_bool("DEBUG")
SECRET_KEY = env.get_string("SECRET_KEY")
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'mydb',
        'USER': 'user',
        'URL': env.get_string("DATABASE_URL")
    }
}
ALLOWED_HOSTS = env.get_json("ALLOWED_HOSTS")
```

---

### Go Web Service

```go
package main

import (
	"fmt"
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
	s.Define("HOST", types.NewStringType().SetDefault("0.0.0.0"))
	s.Define("DATABASE_URL", types.NewURLType().MarkRequired())
	s.Define("SECRET_KEY", types.NewSecretType().MarkRequired())

	// Load configuration
	content, err := os.ReadFile(".env")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading .env: %v\n", err)
		os.Exit(1)
	}

	result := adapters.ParseDotenv(string(content))
	if !result.Valid {
		for _, e := range result.Errors {
			fmt.Fprintf(os.Stderr, "Line %d: %s\n", e.Line, e.Message)
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
		fmt.Fprintf(os.Stderr, "Configuration error: %v\n", err)
		os.Exit(1)
	}

	// Use configuration
	port, _ := env.GetInt("PORT")
	host, _ := env.GetString("HOST")

	// Start server
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello from TER!"))
	})

	addr := fmt.Sprintf("%s:%d", host, port)
	fmt.Printf("Server listening on %s\n", addr)
	http.ListenAndServe(addr, nil)
}
```

---

## Language SDKs

### Node.js

```bash
npm install ter
```

```typescript
import { env } from 'ter';

const config = env.create(
  env.define({
    DATABASE_URL: env.types.url().markRequired(),
    PORT: env.types.int().default(3000)
  })
);

const dbUrl = config.getString('DATABASE_URL');
const port = config.getInt('PORT');
```

### Python

```bash
cd python && pip install -e .
```

```python
from ter import Schema, Types, Environment

schema = Schema()
schema.define("DATABASE_URL", Types.url().mark_required())
schema.define("PORT", Types.int().default(3000))

config = Environment(schema, resolver)
db_url = config.get_string("DATABASE_URL")
port = config.get_int("PORT")
```

### Go

```bash
go get github.com/ter-sdk/ter-go
```

```go
import "github.com/ter-sdk/ter-go/schema"
import "github.com/ter-sdk/ter-go/types"

s := schema.NewSchema()
s.Define("DATABASE_URL", types.NewURLType().MarkRequired())
s.Define("PORT", types.NewIntType().SetDefault(3000))

port, _ := env.GetInt("PORT")
dbUrl, _ := env.GetString("DATABASE_URL")
```

---

## Deployment Patterns

### Docker Integration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Validate configuration at build time
RUN node -e "require('./dist/cli/cli.js').validateCommand()"

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Kubernetes ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  .ter.json: |
    {
      "variables": {
        "DATABASE_URL": {"type": "url", "required": true},
        "PORT": {"type": "int", "default": 3000}
      }
    }

---
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: config
      mountPath: /etc/config
  volumes:
  - name: config
    configMap:
      name: app-config
```

### Environment-Specific Configuration

```bash
# Load environment-specific .env file
NODE_ENV=production ter check --env .env.production

# Or in application code
const envFile = `.env.${process.env.NODE_ENV}`;
const config = env.create(schema, { fileEnv: parseDotEnv(fs.readFileSync(envFile)) });
```

### Multi-Environment Setup

```
configs/
├── .ter.json           # Schema definition
├── .env.development    # Dev environment
├── .env.staging        # Staging environment
└── .env.production     # Production environment
```

---

## Best Practices

### 1. Fail Fast on Startup

```typescript
// Good - validate at startup
async function startApp() {
  try {
    const config = loadConfig();
    config.validate();  // Throws if invalid
    startServer(config);
  } catch (error) {
    console.error('Invalid configuration:', error);
    process.exit(1);
  }
}
```

### 2. Use Templates

```bash
# Use template for common services
cp templates/postgresql.json .ter.json

# Customize for your needs
ter explain DATABASE_URL
```

### 3. Secret Management

```typescript
// Mark sensitive values as secret
const schema = env.define({
  API_KEY: env.types.secret().markRequired(),
  JWT_SECRET: env.types.secret().markRequired()
});

// Values are automatically redacted in logs/output
console.log(config.toObject());  // Secrets shown as ****
```

### 4. Validation Layers

```typescript
// Application-level validation
const config = loadTERConfig();

// Additional validation
if (config.getInt('PORT') < 1024 && process.platform !== 'win32') {
  throw new Error('Ports < 1024 require root access');
}
```

### 5. Configuration Caching

```typescript
// Load once at startup
let cachedConfig: Environment;

export function getConfig(): Environment {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

// Use throughout app
const port = getConfig().getInt('PORT');
```

### 6. Type Safety

```typescript
// Explicit types
const port: number = config.getInt('PORT');
const url: string = config.getString('DATABASE_URL');
const debug: boolean = config.getBool('DEBUG');

// Avoid
const port = config.get('PORT');  // type: any
```

---

## Troubleshooting

### Configuration Not Loading

```bash
# Check if file exists
ls -la .env

# Validate syntax
ter check --env .env

# Show detailed errors
ter check --env .env 2>&1
```

### Type Validation Errors

```bash
# Explain variable requirements
ter explain DATABASE_URL

# See example values
ter explain PORT
```

### Missing Required Variables

```typescript
try {
  config.validate();
} catch (error) {
  // Error message shows which variables are missing
  console.error(error.message);  // "PORT is required"
}
```

### Environment Variables Not Overriding

Remember the priority order:
1. Process environment (highest)
2. File environment (.env)
3. Injected values
4. Defaults (lowest)

```typescript
// Process env has highest priority
process.env.PORT = '9000';

// Even if .env has PORT=3000, process.env wins
const port = config.getInt('PORT');  // 9000
```

---

## Migration Checklist

- [ ] Create `.ter.json` schema file
- [ ] Move all env vars to schema definition
- [ ] Add validation at application startup
- [ ] Update documentation with variable descriptions
- [ ] Test with `.env.example` file
- [ ] Update CI/CD pipeline
- [ ] Deploy with monitoring for config errors
- [ ] Remove manual env documentation (replaced by TER)

---

## Support & Resources

- [README.md](./README.md) - Quick start
- [SDK_GUIDE.md](./SDK_GUIDE.md) - API reference
- [PHASE3.md](./PHASE3.md) - Implementation details
- [templates/](./templates/) - Pre-built templates
- [BENCHMARKS.md](./BENCHMARKS.md) - Performance data

---

**Last Updated**: 2025-12-15  
**Version**: 0.1.0
