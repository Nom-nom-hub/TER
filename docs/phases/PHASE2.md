# TER Phase 2 Features

This document describes the new features added in Phase 2.

## 1. JSON Schema Export

Export your TER contract as JSON Schema Draft 7 for use with third-party validation tools, IDE integrations, and documentation generators.

### Usage

```bash
# Export to stdout
ter schema --contract .ter.json

# Export to file
ter schema --contract .ter.json --output schema.json
```

### Output

The exported JSON Schema includes:
- Full type mapping (string, integer, number, boolean, enum, uri, etc.)
- Constraints (min/max length, patterns, numeric ranges)
- Required/optional fields
- Examples for each field
- Descriptions with constraint information
- Security annotations for secrets

### Example Output

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Application Configuration",
  "type": "object",
  "properties": {
    "DATABASE_URL": {
      "type": "string",
      "format": "uri",
      "description": "A valid URL (with protocol) (required)",
      "examples": ["https://example.com", "postgres://localhost/db"]
    },
    "PORT": {
      "type": "integer",
      "description": "An integer value (optional) default: 3000",
      "examples": ["3000"]
    },
    "NODE_ENV": {
      "type": "string",
      "enum": ["development", "staging", "production"],
      "description": "One of the allowed values (optional) default: development"
    },
    "API_KEY": {
      "type": "string",
      "description": "A secret/sensitive value (should not be logged) (required)"
    }
  },
  "required": ["DATABASE_URL", "API_KEY"],
  "additionalProperties": false
}
```

### Use Cases

1. **IDE Integration**: Many IDEs can validate YAML/JSON using JSON Schema
2. **Documentation**: Generate docs from schema automatically
3. **Validation Tools**: Use with ajv, zod, or other validators
4. **API Documentation**: Include in OpenAPI specs
5. **Tooling**: Feed into code generation tools

## 2. Environment Watch/Reload

Monitor `.env` files for changes and automatically reload configuration with validation.

### Usage

```bash
ter watch --contract .ter.json --env .env
```

### Features

- **File monitoring**: Automatically detects changes to .env files
- **Debounced reloading**: Prevents excessive reloads during rapid edits
- **Validation**: Validates after each reload and reports errors
- **Change tracking**: Shows what variables were added, removed, or modified
- **Timestamps**: Displays time of each change
- **Graceful shutdown**: Press Ctrl+C to stop watching

### Example Output

```
✓ Environment valid. Watching: .env
  Press Ctrl+C to stop watching

[14:23:45] MODIFIED: PORT, DATABASE_URL
  ✓ Valid
[14:23:52] ADDED: DEBUG
  ✓ Valid
[14:24:10] REMOVED: DEPRECATED_VAR
  ✗ Validation failed:
    REQUIRED_VAR: Value is required
```

### Use Cases

1. **Development**: Hot-reload environment during testing
2. **Debugging**: Monitor config changes in real-time
3. **DevOps**: Watch deployment configuration files
4. **CI/CD**: Monitor environment setup during builds
5. **Scripts**: Integrate with long-running processes

## 3. Schema JSON Serialization

Improved handling of schema serialization to JSON contracts and back.

### API

```typescript
import { exportSchemaToJSON, reconstructSchemaFromJSON } from 'ter';

// Export schema to JSON
const json = exportSchemaToJSON(schema);
fs.writeFileSync('.ter.json', JSON.stringify(json, null, 2));

// Reconstruct from JSON
const schema = reconstructSchemaFromJSON(json);
```

### Features

- Preserves all type information and constraints
- Handles enum values correctly
- Supports min/max for strings and numbers
- Stores regex patterns
- Preserves default values
- Maintains required/optional status

## Integration Examples

### Using with Node.js Watch Mode

```bash
# Watch .env and reload your app
ter watch --env .env & npm run dev
```

### Using with Docker/Compose

```yaml
services:
  app:
    environment:
      - APP_ENV=production
    volumes:
      - ./.env:/app/.env:ro
    # Reload config if .env changes
    command: ter watch --env .env -- npm start
```

### Schema Validation in Tests

```typescript
import * as Ajv from 'ajv';
import { schemaToJSONSchema } from 'ter';

const ajv = new Ajv();
const jsonSchema = schemaToJSONSchema(terSchema);
const validate = ajv.compile(jsonSchema);

// Use validate() in tests
const valid = validate(data);
```

### IDE Configuration

Many IDEs support JSON Schema validation via `$schema` comments:

```json
{
  "$schema": "file:///project/schema.json",
  "DATABASE_URL": "postgres://localhost/db",
  "PORT": "3000"
}
```

Or in settings:

```json
{
  "json.schemas": [
    {
      "fileMatch": [".env.json"],
      "url": "file:///project/schema.json"
    }
  ]
}
```

## Next Steps (Phase 2 Remaining)

- [ ] Better error messages with suggestions
- [ ] Dotenv adapter improvements (escapes, multiline)
- [ ] File adapter with YAML support
- [ ] MCP (Model Context Protocol) integration
- [ ] Template library

## Testing

All Phase 2 features are covered by comprehensive tests:

```bash
npm test
# 47 tests passing across:
# - json-schema.test.ts (13 tests)
# - watcher.test.ts (9 tests)
# - basic.test.ts (16 tests)
# - inheritance.test.ts (9 tests)
```

## Troubleshooting

### JSON Schema export shows "string" for my enum

Enums are represented as `string` type with an `enum` array of allowed values in JSON Schema.

### Watch command not detecting changes

- Ensure the .env file path is correct
- Check file permissions
- Try updating the file (write then save)
- Note: Some editors may not trigger file watches properly; use `touch .env` to force

### Reload failed with validation error

Watch mode shows validation errors after reload. Fix the .env file and save again.

### Port already in use warning

If using `ter watch -- <command>`, ensure the previous command was terminated.
