# TER Quick Start Guide

## Installation

```bash
npm install
npm run build
```

## Basic Usage

### 1. Initialize a contract

```bash
ter init --contract .ter.json
```

Creates `.ter.json` with template variables.

### 2. Create .env file

```
DATABASE_URL=postgres://localhost/db
PORT=3000
NODE_ENV=development
API_KEY=secret123
```

### 3. Validate environment

```bash
ter check --contract .ter.json --env .env
```

Output:
```
✓ Environment is valid

Resolved variables:
  DATABASE_URL: postgres://localhost/db (from file)
  PORT: 3000 (from file)
  ...
```

### 4. Run with validated env

```bash
ter run --env .env -- npm start
```

Your app starts with validated environment.

## Common Commands

### Explain a variable
```bash
ter explain DATABASE_URL
```

### Compare two environments
```bash
ter diff .env.dev .env.prod
```

### View environment hierarchy
```bash
ter graph --graph .ter-graph.json
```

## Contract File Format

```json
{
  "version": "1.0",
  "variables": [
    {
      "name": "DATABASE_URL",
      "type": "url",
      "required": true,
      "defaultValue": null,
      "isSecret": false
    },
    {
      "name": "PORT",
      "type": "int",
      "required": false,
      "defaultValue": 3000
    }
  ]
}
```

## Supported Types

- `string` - Basic text values
- `int` - Integers only
- `number` - Any numeric value
- `boolean` - true/false (also: yes/no, 1/0, on/off)
- `enum` - Restricted set of values
- `url` - Valid URLs only
- `json` - Parsed JSON objects
- `secret` - Sensitive values (redacted in output)

## Type Constraints

**String:**
- `min(length)` - Minimum length
- `max(length)` - Maximum length
- `matches(regex)` - Regex pattern

**Number/Int:**
- `minimum(value)` - Minimum value
- `maximum(value)` - Maximum value

**All types:**
- `default(value)` - Default value
- `markRequired()` - Must be present
- `optional()` - May be absent

## Environment Inheritance

Create `.ter-graph.json`:

```json
{
  "version": "1.0",
  "environments": [
    {
      "name": "base",
      "values": {
        "DATABASE_URL": "postgres://localhost/db",
        "PORT": "3000"
      }
    },
    {
      "name": "production",
      "extends": "base",
      "values": {
        "DATABASE_URL": "postgres://prod-server/db"
      }
    }
  ]
}
```

View hierarchy:
```bash
ter graph --graph .ter-graph.json
```

## Using in Code

```typescript
import { env } from 'ter';

// Define schema
const schema = env.define({
  DATABASE_URL: env.types.url().markRequired(),
  PORT: env.types.int().default(3000),
  API_KEY: env.types.secret().markRequired(),
});

// Create environment
const config = env.create(schema);

// Type-safe access
const port = config.getInt('PORT');
const dbUrl = config.getString('DATABASE_URL');

// Validation
const validation = config.validate();
if (!validation.valid) {
  console.error('Config errors:', validation.errors);
  process.exit(1);
}

// Safe output (secrets hidden)
console.log(config.getAllValues(true));
```

## Tips

- Always run `ter check` before deploying
- Use `ter explain` to show teammates variable requirements
- Use `ter graph` to visualize multi-environment setups
- Use `ter run --` to ensure apps only run with valid config
- Commit `.ter.json` contract but not `.env` files
- Use `.env.example` as a template with dummy values

## Troubleshooting

**"Variable not found in contract"**
- Add the variable to `.ter.json` or remove it from `.env`

**"Value is not a valid URL"**
- Check the URL format: must include protocol (http://, postgres://, etc.)

**"Circular dependency detected"**
- Check your `.ter-graph.json` for inheritance loops (env extends another that extends it)

**"Environment validation failed"**
- Run `ter check --env .env` to see which variables are invalid
- Run `ter explain VAR_NAME` to see what values are allowed
