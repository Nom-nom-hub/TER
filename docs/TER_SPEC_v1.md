# TER Specification v1.0

**Title**: Typed Environment Runtime (TER) Specification  
**Version**: 1.0.0-draft  
**Status**: Release Candidate  
**Date**: 2025-12-15  

---

## 1. Introduction

### 1.1 Purpose

The TER Specification defines a portable, language-agnostic format for declaring, validating, and executing environment variable contracts. It enables:

- **Portable validation** across languages and runtimes
- **Machine-readable contracts** for tooling and AI systems
- **Compliance-ready auditing** of configuration
- **Type-safe configuration** at application startup

### 1.2 Scope

This specification covers:
- Contract definition and schema structure
- Type system and validation semantics
- Resolution priority and source handling
- Metadata and audit trail format
- Extension mechanisms

This specification does NOT cover:
- Specific implementations (use cases for SDKs)
- Secret storage backends (e.g., Vault, AWS Secrets Manager)
- CI/CD integration patterns (covered in integration guides)
- UI/UX considerations

### 1.3 Conformance

An implementation is conformant if it:
1. Implements all normative features in Section 3 (Type System)
2. Implements the resolution algorithm in Section 4 (Resolution)
3. Validates according to Section 5 (Validation)
4. Produces compatible output formats (Section 6)
5. Maintains backward compatibility per Section 7

---

## 2. Architecture

### 2.1 Core Concepts

#### Contract
A machine-readable declaration of environment variable requirements.

**Example**:
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

#### Schema
A contract encoded in a specific language/format (JSON, TypeScript, Python, etc).

#### Resolution
The process of finding values from multiple sources (process env, files, injected values).

#### Validation
The process of checking that resolved values match type constraints.

### 2.2 Design Principles

1. **Portability** - Contracts are language-agnostic
2. **Simplicity** - Minimal required complexity
3. **Explicitness** - All behavior is defined, nothing implicit
4. **Safety** - Type errors caught early, not at runtime
5. **Auditability** - All operations are traceable
6. **Extensibility** - Custom types and validators allowed

---

## 3. Type System

### 3.1 Normative Types (MUST Implement)

Every conformant implementation must support these 8 types:

#### 3.1.1 String
**Type name**: `string`

**Definition**: UTF-8 text value

**Constraints**:
- `min` (integer) - minimum length in characters
- `max` (integer) - maximum length in characters
- `pattern` (regex) - must match pattern
- `enum` (array) - must be one of allowed values

**Coercion**: Identity function (strings remain strings)

**Validation**: Checks length, pattern, and enum constraints

**Example**:
```json
{
  "type": "string",
  "min": 3,
  "max": 100,
  "pattern": "^[a-z]+$"
}
```

#### 3.1.2 Integer
**Type name**: `int`

**Definition**: Signed 64-bit integer

**Constraints**:
- `minimum` (integer) - inclusive lower bound
- `maximum` (integer) - inclusive upper bound

**Coercion**: Parse string as base-10 integer

**Validation**: Check bounds after coercion

**Example**:
```json
{
  "type": "int",
  "minimum": 1,
  "maximum": 65535
}
```

#### 3.1.3 Number
**Type name**: `number`

**Definition**: IEEE 754 double-precision float

**Constraints**:
- `minimum` (number) - inclusive lower bound
- `maximum` (number) - inclusive upper bound

**Coercion**: Parse string as decimal number

**Validation**: Check bounds after coercion

**Example**:
```json
{
  "type": "number",
  "minimum": 0.0,
  "maximum": 1.0
}
```

#### 3.1.4 Boolean
**Type name**: `boolean`

**Definition**: True or false

**Constraints**: None

**Coercion**: 
- `"true"`, `"1"`, `"yes"` → true
- `"false"`, `"0"`, `"no"` → false
- Other values → error

**Validation**: None (after coercion succeeds)

**Example**:
```json
{
  "type": "boolean"
}
```

#### 3.1.5 Enum
**Type name**: `enum`

**Definition**: One of a fixed set of string values

**Constraints**:
- `values` (array of strings) - allowed values (REQUIRED)

**Coercion**: Identity

**Validation**: Must match one value in `values`

**Example**:
```json
{
  "type": "enum",
  "values": ["dev", "staging", "prod"]
}
```

#### 3.1.6 URL
**Type name**: `url`

**Definition**: Valid HTTP(S) or generic URL

**Constraints**:
- `protocol` (string) - must start with this protocol (e.g., "https")

**Coercion**: Identity

**Validation**: Parse as URL, check protocol if specified

**Example**:
```json
{
  "type": "url",
  "protocol": "https"
}
```

#### 3.1.7 JSON
**Type name**: `json`

**Definition**: Valid JSON value (object, array, string, number, boolean, null)

**Constraints**: None

**Coercion**: Parse as JSON

**Validation**: Must be valid JSON

**Example**:
```json
{
  "type": "json"
}
```

#### 3.1.8 Secret
**Type name**: `secret`

**Definition**: Sensitive string (passwords, tokens, keys)

**Constraints**: None

**Coercion**: Identity

**Validation**: Same as string (no special validation)

**Special Behavior**: 
- Never logged or displayed
- Redacted in output/audit trails
- Must be marked as secret in all APIs

**Example**:
```json
{
  "type": "secret"
}
```

### 3.2 Type Properties

Every type definition supports:

#### 3.2.1 Required
**Property name**: `required`  
**Type**: boolean  
**Default**: false  
**Meaning**: Variable must be present

If `required: true` and value is absent, validation fails.

#### 3.2.2 Default
**Property name**: `default`  
**Type**: depends on type  
**Default**: none  
**Meaning**: Value to use if variable is absent

If `default` is provided, the variable is implicitly optional.

**Constraints**: Default value must pass type validation.

#### 3.2.3 Description
**Property name**: `description`  
**Type**: string  
**Default**: none  
**Meaning**: Human-readable explanation of this variable

Normative for documentation, optional for implementations.

### 3.3 Custom Types (Optional)

Implementations MAY support custom types beyond the 8 normative types.

Custom types MUST:
- Have unique `type` name
- Define coercion and validation rules
- Be documented in implementation
- Maintain compatibility with standard types

**Note**: Contracts using custom types are not portable across implementations.

---

## 4. Resolution

### 4.1 Resolution Algorithm

Variables are resolved from multiple sources in strict priority order:

1. **Injected values** (highest priority)
   - Values explicitly provided to the runtime
   - Used for testing and programmatic injection

2. **File values**
   - Values from `.env` files or similar
   - Parsed according to implementation

3. **Process environment**
   - Values from `process.env` (Node) or `os.environ` (Python), etc.
   - Native to the runtime

4. **Default values** (lowest priority)
   - Specified in the contract

### 4.2 Resolution Process

For each variable:

1. Check injected values
2. If found, use it (skip to 5)
3. Check file values
4. If found, use it (skip to 5)
5. Check process environment
6. If found, use it (skip to 5)
7. If `default` specified, use it (skip to 5)
8. If `required: true`, fail with error
9. If `required: false`, return `null`/`undefined`

### 4.3 Metadata Tracking

Every resolved value MUST be accompanied by metadata:

```json
{
  "name": "DATABASE_URL",
  "value": "postgres://localhost/db",
  "metadata": {
    "source": "file",
    "resolvedAt": "2025-12-15T00:00:00Z",
    "sourceLocation": ".env"
  }
}
```

Metadata includes:
- **source**: Where the value came from (injected, file, process, default)
- **resolvedAt**: When it was resolved (ISO 8601 timestamp)
- **sourceLocation**: Path to file (if applicable)

---

## 5. Validation

### 5.1 Validation Process

For each variable:

1. Resolve value (Section 4)
2. If value is `null`/`undefined`:
   - If `required: true`, error
   - Otherwise, success
3. Coerce value according to type
4. If coercion fails, error
5. Validate against type constraints
6. If validation fails, error
7. Return valid value with metadata

### 5.2 Validation Results

Validation output MUST include:

```json
{
  "valid": true|false,
  "variables": [
    {
      "name": "DATABASE_URL",
      "valid": true,
      "value": "postgres://...",
      "metadata": { ... }
    },
    {
      "name": "PORT",
      "valid": false,
      "error": "Value 'abc' is not an integer"
    }
  ],
  "errors": [
    {
      "variable": "PORT",
      "error": "Value 'abc' is not an integer"
    }
  ]
}
```

### 5.3 Error Handling

Implementations MUST report:
- **Variable name**
- **Expected type**
- **Actual value** (redacted if secret)
- **Constraint violated** (if applicable)
- **Suggestion** (if applicable)

---

## 6. Portable Formats

### 6.1 JSON Schema Format

Contracts MAY be exported as JSON Schema (draft-7 compatible):

```json
{
  "type": "object",
  "properties": {
    "DATABASE_URL": {
      "type": "string",
      "format": "uri"
    },
    "PORT": {
      "type": "integer",
      "minimum": 1,
      "maximum": 65535,
      "default": 3000
    }
  },
  "required": ["DATABASE_URL"]
}
```

### 6.2 JSON Contract Format

Contracts MAY be represented as plain JSON:

```json
{
  "DATABASE_URL": {
    "type": "url",
    "required": true
  },
  "PORT": {
    "type": "int",
    "default": 3000
  }
}
```

### 6.3 Language-Specific Formats

Implementations provide language-specific schema definitions:
- TypeScript: `defineSchema({ ... })`
- Python: `Schema(...)`
- Go: `schema.Define(...)`

All formats are semantically equivalent.

---

## 7. Versioning & Compatibility

### 7.1 Semantic Versioning

TER Specification follows semver:
- **MAJOR**: Breaking changes (e.g., removing a normative type)
- **MINOR**: New features (e.g., new optional type)
- **PATCH**: Clarifications (e.g., documentation fixes)

### 7.2 Backward Compatibility

Within a MAJOR version:
- All normative features are stable
- New optional features MAY be added in MINOR versions
- Existing contracts remain valid
- Existing implementations remain valid

### 7.3 Future Versions

Planned additions for v1.1+:
- Variable expansion (`${VAR}` syntax)
- Conditional constraints
- Custom validator functions
- Plugin system

These are NOT in v1.0 and implementations must not assume them.

---

## 8. Implementation Requirements

### 8.1 Mandatory

Every conformant implementation MUST:

1. **Type System**
   - Support all 8 normative types
   - Implement coercion per spec
   - Implement validation per spec

2. **Resolution**
   - Implement 4-source priority order
   - Track metadata per variable
   - Handle missing values correctly

3. **Validation**
   - Report all errors, not just first
   - Include variable names and error messages
   - Redact secrets in output

4. **Portability**
   - Export to JSON format
   - Read JSON contracts
   - Maintain semantic equivalence

5. **Compatibility**
   - Maintain v1.0 compatibility throughout v1.x
   - Document any deviations from spec
   - Provide migration path for future versions

### 8.2 Optional

Implementations MAY provide:

1. **Custom types**
   - With full documentation
   - Maintained across versions
   - Clearly marked as non-standard

2. **Secret backends**
   - Integration with Vault, AWS, etc.
   - Orthogonal to core validation

3. **Audit logging**
   - Detailed operation tracking
   - Compliance-ready output

4. **CLI tools**
   - Validation commands
   - Contract introspection
   - Interactive wizards

5. **Extensions**
   - Plugins, hooks, custom validators
   - Documented versioning
   - Breaking change policy

---

## 9. Reference Examples

### 9.1 Minimal Contract

```json
{
  "DATABASE_URL": { "type": "url", "required": true },
  "API_KEY": { "type": "secret", "required": true }
}
```

### 9.2 Complex Contract

```json
{
  "DATABASE_URL": {
    "type": "url",
    "required": true,
    "description": "PostgreSQL connection string"
  },
  "PORT": {
    "type": "int",
    "minimum": 1,
    "maximum": 65535,
    "default": 3000,
    "description": "Server port"
  },
  "ENVIRONMENT": {
    "type": "enum",
    "values": ["development", "staging", "production"],
    "default": "development"
  },
  "DEBUG": {
    "type": "boolean",
    "default": false
  },
  "LOG_LEVEL": {
    "type": "enum",
    "values": ["error", "warn", "info", "debug"],
    "default": "info"
  },
  "API_KEY": {
    "type": "secret",
    "required": true
  },
  "CONFIG_JSON": {
    "type": "json",
    "description": "Optional configuration as JSON"
  }
}
```

### 9.3 TypeScript Contract

```typescript
const schema = defineSchema({
  DATABASE_URL: url().markRequired(),
  PORT: int().minimum(1).maximum(65535).default(3000),
  ENVIRONMENT: enum(['dev', 'staging', 'prod']).default('dev'),
  DEBUG: boolean().default(false),
  API_KEY: secret().markRequired(),
});
```

### 9.4 Python Contract

```python
schema = Schema(
    DATABASE_URL=URL(required=True),
    PORT=Int(minimum=1, maximum=65535, default=3000),
    ENVIRONMENT=Enum(values=['dev', 'staging', 'prod'], default='dev'),
    DEBUG=Boolean(default=False),
    API_KEY=Secret(required=True),
)
```

---

## 10. Conformance Testing

### 10.1 Test Suite

Conformant implementations SHOULD pass the official TER conformance test suite:
- Type coercion tests (each type)
- Validation tests (each constraint)
- Resolution tests (priority order)
- Error message tests
- Metadata tests

### 10.2 Reporting

Implementations SHOULD report:
- TER specification version implemented
- Any deviations or extensions
- Test pass rate
- Known limitations

---

## Appendix A: ABNF Grammar

```
contract = "{" *( variable-def "," ) variable-def "}"

variable-def = DQUOTE varname DQUOTE ":" type-def

type-def = "{" *( property "," ) property "}"

property = property-name ":" property-value

property-name = "type" | "required" | "default" | "description" | 
                "minimum" | "maximum" | "min" | "max" | 
                "pattern" | "enum" | "protocol" | "values"

property-value = string | number | boolean | array | object

varname = ALPHA *( ALPHA / DIGIT / "_" )
```

---

## Appendix B: Type Coercion Reference

| Type | Input | Output | Error Condition |
|------|-------|--------|-----------------|
| string | any string | identity | (none) |
| int | "123" | 123 | non-numeric, out of range |
| number | "1.5" | 1.5 | non-numeric, out of range |
| boolean | "true" / "false" | true / false | non-boolean string |
| enum | "value" | "value" | not in values list |
| url | "https://..." | parsed URL | invalid URL format |
| json | '{"k":"v"}' | object | invalid JSON |
| secret | any string | identity | (none) |

---

## Appendix C: Migration Guide

### Migrating from .env Files

```
Before:
# .env (unstructured)
DATABASE_URL=postgres://localhost/db
PORT=3000
API_KEY=secret123

After:
# .ter.json (contract)
{
  "DATABASE_URL": {"type": "url", "required": true},
  "PORT": {"type": "int", "default": 3000},
  "API_KEY": {"type": "secret", "required": true}
}

# .env (same format)
DATABASE_URL=postgres://localhost/db
PORT=3000
API_KEY=secret123
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-12-15 | Initial specification |

---

**Status**: This is a draft specification. It is subject to change before final release.

For implementation details and examples, see the official TER documentation.
