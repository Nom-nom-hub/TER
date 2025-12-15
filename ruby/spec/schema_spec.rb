# frozen_string_literal: true

require 'spec_helper'

describe Ter::Core::Schema do
  let(:schema) { Ter::Core::Schema.new }

  describe '#define' do
    it 'defines a new variable' do
      type = schema.define('DATABASE_URL', Ter::Core::Types.string)
      expect(schema.has_variable?('DATABASE_URL')).to be true
      expect(type).to be_a(Ter::Core::StringType)
    end

    it 'raises on invalid type' do
      expect { schema.define('VAR', 'not a type') }.to raise_error(ArgumentError)
    end

    it 'raises on invalid name' do
      expect { schema.define(123, Ter::Core::Types.string) }.to raise_error(ArgumentError)
    end

    it 'allows chaining type methods' do
      type = schema.define('PORT', Ter::Core::Types.int.min(1).max(65535).mark_required)
      expect(type.required).to be true
    end
  end

  describe '#get_variable' do
    it 'returns defined variable' do
      schema.define('API_KEY', Ter::Core::Types.secret)
      type = schema.get_variable('API_KEY')
      expect(type).to be_a(Ter::Core::SecretType)
    end

    it 'returns nil for undefined variable' do
      expect(schema.get_variable('UNDEFINED')).to be_nil
    end
  end

  describe '#has_variable?' do
    it 'returns true for defined variables' do
      schema.define('VAR', Ter::Core::Types.string)
      expect(schema.has_variable?('VAR')).to be true
    end

    it 'returns false for undefined variables' do
      expect(schema.has_variable?('UNDEFINED')).to be false
    end
  end

  describe '#get_variables' do
    it 'returns copy of all variables' do
      schema.define('VAR1', Ter::Core::Types.string)
      schema.define('VAR2', Ter::Core::Types.int)

      vars = schema.get_variables
      expect(vars).to have_key('VAR1')
      expect(vars).to have_key('VAR2')
      expect(vars.size).to eq(2)
    end

    it 'returns empty hash for new schema' do
      expect(schema.get_variables).to eq({})
    end
  end

  describe '#validate' do
    before do
      schema.define('NAME', Ter::Core::Types.string.mark_required)
      schema.define('AGE', Ter::Core::Types.int.min(0).max(150))
    end

    it 'validates all variables' do
      result = schema.validate('NAME' => 'Alice', 'AGE' => 30)
      expect(result[:valid]).to be true
    end

    it 'collects validation errors' do
      result = schema.validate('NAME' => nil, 'AGE' => 200)
      expect(result[:valid]).to be false
      expect(result[:errors]).to have_at_least(2).items
    end

    it 'allows missing optional variables' do
      result = schema.validate('NAME' => 'Alice')
      expect(result[:valid]).to be true
    end
  end

  describe '#to_contract' do
    it 'exports schema to JSON contract' do
      schema.define('NAME', Ter::Core::Types.string.min_length(1).max_length(100).mark_required.describe('User name'))
      schema.define('PORT', Ter::Core::Types.int.min(1).max(65535).default(3000))

      contract = schema.to_contract
      expect(contract).to have_key('NAME')
      expect(contract).to have_key('PORT')
      expect(contract['NAME'][:type]).to eq('StringType')
      expect(contract['NAME'][:required]).to be true
      expect(contract['PORT'][:default]).to eq(3000)
    end

    it 'exports constraints' do
      schema.define('EMAIL', Ter::Core::Types.string.pattern(/^.+@.+\..+$/).describe('User email'))
      contract = schema.to_contract

      expect(contract['EMAIL']).to have_key(:pattern)
    end

    it 'exports enum values' do
      schema.define('ENV', Ter::Core::Types.enum('dev', 'staging', 'prod'))
      contract = schema.to_contract

      expect(contract['ENV'][:enum]).to include('dev', 'staging', 'prod')
    end
  end

  describe '.from_contract' do
    it 'reconstructs schema from contract' do
      original = Ter::Core::Schema.new
      original.define('NAME', Ter::Core::Types.string.mark_required)
      original.define('AGE', Ter::Core::Types.int.default(0))

      contract = original.to_contract
      reconstructed = Ter::Core::Schema.from_contract(contract)

      expect(reconstructed.has_variable?('NAME')).to be true
      expect(reconstructed.has_variable?('AGE')).to be true
      expect(reconstructed.get_variable('NAME').required).to be true
      expect(reconstructed.get_variable('AGE').default_value).to eq(0)
    end

    it 'preserves constraints in reconstruction' do
      original = Ter::Core::Schema.new
      original.define('COUNT', Ter::Core::Types.int.min(0).max(100))

      contract = original.to_contract
      reconstructed = Ter::Core::Schema.from_contract(contract)

      type = reconstructed.get_variable('COUNT')
      result = type.validate(50)
      expect(result[:valid]).to be true

      result = type.validate(200)
      expect(result[:valid]).to be false
    end

    it 'handles all type variants' do
      original = Ter::Core::Schema.new
      original.define('STR', Ter::Core::Types.string)
      original.define('INT', Ter::Core::Types.int)
      original.define('NUM', Ter::Core::Types.number)
      original.define('BOOL', Ter::Core::Types.boolean)
      original.define('ENUM', Ter::Core::Types.enum('a', 'b'))
      original.define('URL', Ter::Core::Types.url)
      original.define('JSON', Ter::Core::Types.json)
      original.define('SECRET', Ter::Core::Types.secret)

      contract = original.to_contract
      reconstructed = Ter::Core::Schema.from_contract(contract)

      expect(reconstructed.get_variables.size).to eq(8)
      expect(reconstructed.get_variable('SECRET')).to be_a(Ter::Core::SecretType)
    end
  end

  describe 'complex schemas' do
    let(:app_schema) do
      schema = Ter::Core::Schema.new
      schema.define('APP_NAME', Ter::Core::Types.string.mark_required.describe('Application name'))
      schema.define('APP_ENV', Ter::Core::Types.enum('dev', 'staging', 'prod').mark_required)
      schema.define('DEBUG', Ter::Core::Types.boolean.default(false))
      schema.define('PORT', Ter::Core::Types.int.min(1).max(65535).default(3000))
      schema.define('DATABASE_URL', Ter::Core::Types.url.mark_required)
      schema.define('DATABASE_TIMEOUT', Ter::Core::Types.number.min(0.0).default(30.0))
      schema.define('LOG_LEVEL', Ter::Core::Types.enum('debug', 'info', 'warn', 'error').default('info'))
      schema.define('FEATURES', Ter::Core::Types.json.default({}))
      schema.define('API_KEY', Ter::Core::Types.secret.mark_required)
      schema
    end

    it 'validates complete applications' do
      values = {
        'APP_NAME' => 'MyApp',
        'APP_ENV' => 'prod',
        'DATABASE_URL' => 'postgres://localhost/mydb',
        'API_KEY' => 'secret123'
      }

      result = app_schema.validate(values)
      expect(result[:valid]).to be true
    end

    it 'detects all validation errors' do
      values = {
        'APP_NAME' => '',  # Empty string, maybe should fail
        'APP_ENV' => 'invalid',  # Not enum
        'PORT' => 'not_a_number',  # Not int
        'DATABASE_URL' => 'not a url',  # Invalid URL
        'API_KEY' => nil  # Required
      }

      result = app_schema.validate(values)
      expect(result[:valid]).to be false
      expect(result[:errors].size).to be > 0
    end

    it 'uses defaults for missing values' do
      values = {
        'APP_NAME' => 'TestApp',
        'APP_ENV' => 'dev',
        'DATABASE_URL' => 'postgres://localhost/db',
        'API_KEY' => 'key123'
      }

      result = app_schema.validate(values)
      expect(result[:valid]).to be true
    end
  end
end
