# TER Ruby SDK

Typed Environment Runtime - Type-safe configuration management for Ruby applications.

## Installation

Add to your Gemfile:

```ruby
gem 'ter', path: '../ruby'
```

Or build and install locally:

```bash
cd ruby
bundle install
gem build ter.gemspec
gem install ter-0.1.0.gem
```

## Quick Start

```ruby
require 'ter'

# Define schema
schema = Ter::Core::Schema.new
schema.define('APP_NAME', Ter::Core::Types.string.mark_required.describe('Application name'))
schema.define('PORT', Ter::Core::Types.int.min(1).max(65535).default(3000))
schema.define('DEBUG', Ter::Core::Types.boolean.default(false))
schema.define('DATABASE_URL', Ter::Core::Types.url.mark_required)
schema.define('API_KEY', Ter::Core::Types.secret.mark_required)

# Resolve from environment
resolver = Ter::Runtime::Resolver.new(schema)
resolver.add_process_env  # Uses ENV by default
resolver.add_file_env(Ter::Adapters::DotEnv.load_file('.env'))  # Optional: .env file

# Create environment
env = Ter::Runtime::Environment.new(schema, resolver)

# Access variables
app_name = env.get_string('APP_NAME')
port = env.get_int('PORT')
debug = env.get_boolean('DEBUG')
db_url = env.get('DATABASE_URL')

# Check if secret
if env.is_secret?('API_KEY')
  puts 'API_KEY is marked as secret'
end

# Get metadata
metadata = env.get_metadata('PORT')
puts "PORT source: #{metadata[:source]}"

# Print all values (secrets redacted)
puts env.to_h.inspect
```

## Type System

All types support builder pattern for configuration:

### StringType
```ruby
Ter::Core::Types.string
  .min_length(5)
  .max_length(100)
  .pattern(/^[a-z]+$/)
  .mark_required
  .default('default_value')
  .describe('User name')
```

### IntType
```ruby
Ter::Core::Types.int
  .min(0)
  .max(100)
  .mark_required
  .default(50)
```

### NumberType
```ruby
Ter::Core::Types.number
  .min(0.0)
  .max(1.0)
  .default(0.5)
```

### BooleanType
```ruby
Ter::Core::Types.boolean
  .default(false)
```

### EnumType
```ruby
Ter::Core::Types.enum('dev', 'staging', 'prod')
  .mark_required
```

### URLType
```ruby
Ter::Core::Types.url
  .mark_required
```

### JSONType
```ruby
Ter::Core::Types.json
  .default({})
```

### SecretType
```ruby
Ter::Core::Types.secret
  .mark_required
  .pattern(/^[a-zA-Z0-9]{32}$/)
```

## Schema Definition

```ruby
schema = Ter::Core::Schema.new

# Define variables
schema.define('NAME', Ter::Core::Types.string.mark_required)
schema.define('AGE', Ter::Core::Types.int.default(0))
schema.define('ENV', Ter::Core::Types.enum('dev', 'prod'))

# Check variable
schema.has_variable?('NAME')  # => true
schema.get_variable('NAME')   # => Type instance

# Get all variables
variables = schema.get_variables

# Validate values
result = schema.validate('NAME' => 'Alice', 'AGE' => 30)
# => { valid: true, errors: [] }

# Export to contract
contract = schema.to_contract
# => { 'NAME' => { type: 'StringType', required: true, ... }, ... }

# Reconstruct from contract
schema2 = Ter::Core::Schema.from_contract(contract)
```

## Resolution Priority

Values are resolved in this order (first match wins):
1. **Process environment** (`ENV`)
2. **File environment** (.env file)
3. **Injected values** (programmatic)
4. **Defaults** (schema defaults)

```ruby
resolver = Ter::Runtime::Resolver.new(schema)

# Add sources in any order
resolver.add_process_env(ENV)  # or ENV by default
resolver.add_file_env(dotenv_values)
resolver.add_injected({ 'VAR' => 'value' })

# Resolve - uses priority ordering
result = resolver.resolve
# => { valid: true, values: {...}, errors: [], metadata: {...} }
```

## Environment Access

```ruby
env = Ter::Runtime::Environment.new(schema, resolver)

# Safe access with type checking
value = env.get('KEY')            # raises if not found
value = env.get_optional('KEY')   # returns nil if not found

# Type-safe getters
string_val = env.get_string('STRING_VAR')
int_val = env.get_int('INT_VAR')
number_val = env.get_number('NUMBER_VAR')
bool_val = env.get_boolean('BOOL_VAR')
json_val = env.get_json('JSON_VAR')

# Metadata
metadata = env.get_metadata('VAR')
# => { source: 'process', resolved_at: 1234567890 }

# Check if secret
env.is_secret?('API_KEY')  # => true

# Convert to hash (secrets redacted)
hash = env.to_h
# => { 'API_KEY' => '[REDACTED]', 'APP_NAME' => 'MyApp', ... }

# Validate
result = env.validate
# => { valid: true, errors: [] }
```

## DotEnv File Handling

```ruby
require 'ter/adapters/dotenv'

# Parse .env file
values = Ter::Adapters::DotEnv.parse(content)
values = Ter::Adapters::DotEnv.load_file('.env')

# Generate .env file
content = Ter::Adapters::DotEnv.generate(values)
Ter::Adapters::DotEnv.save_file('.env', values)

# Support for:
# - Simple key=value pairs
# - Quoted values
# - Line continuation with backslash
# - Heredoc syntax (<<EOF...EOF)
# - Comments
```

## Escape and Unescape

```ruby
# Escape for .env format
escaped = Ter::Adapters::DotEnv.escape_value('value with "quotes" and $variables')
# => "\"value with \\\"quotes\\\" and \\$variables\""

# Unescape from .env format
unescaped = Ter::Adapters::DotEnv.unescape_value('"quoted"')
# => "quoted"
```

## Testing

```bash
cd ruby
bundle install
bundle exec rspec
```

All tests pass with full type checking and comprehensive edge case coverage.

## API Reference

### Ter::Core::Types
- `Types.string` - StringType
- `Types.int` - IntType
- `Types.number` - NumberType
- `Types.boolean` - BooleanType
- `Types.enum(...)` - EnumType
- `Types.url` - URLType
- `Types.json` - JSONType
- `Types.secret` - SecretType

### BaseType methods
- `.mark_required` - Make required
- `.default(value)` - Set default
- `.describe(text)` - Set description
- `.validate(value)` - Validate value
- `.coerce(value)` - Coerce to type

### Schema methods
- `.define(name, type)` - Define variable
- `.get_variable(name)` - Get type
- `.has_variable?(name)` - Check existence
- `.get_variables` - Get all variables
- `.validate(values)` - Validate values
- `.to_contract` - Export to JSON
- `.from_contract(contract)` - Import from JSON

### Resolver methods
- `.add_process_env(env)` - Add process env
- `.add_file_env(values)` - Add file env
- `.add_injected(values)` - Add injected
- `.resolve` - Resolve all values
- `.get_metadata(name)` - Get metadata
- `.get_all_metadata` - Get all metadata

### Environment methods
- `.get(key)` - Get value
- `.get_optional(key)` - Get optional
- `.get_string(key)` - Get string
- `.get_int(key)` - Get int
- `.get_number(key)` - Get number
- `.get_boolean(key)` - Get boolean
- `.get_json(key)` - Get JSON
- `.get_metadata(key)` - Get metadata
- `.is_secret?(key)` - Check if secret
- `.to_h` - Convert to hash
- `.validate` - Validate environment

## Version

0.1.0

## License

MIT
