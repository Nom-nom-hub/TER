# frozen_string_literal: true

require 'spec_helper'

describe Ter::Runtime::Environment do
  let(:schema) do
    schema = Ter::Core::Schema.new
    schema.define('APP_NAME', Ter::Core::Types.string.mark_required)
    schema.define('PORT', Ter::Core::Types.int.default(3000))
    schema.define('DEBUG', Ter::Core::Types.boolean.default(false))
    schema.define('API_KEY', Ter::Core::Types.secret)
    schema
  end

  let(:resolver) { Ter::Runtime::Resolver.new(schema) }

  describe '#get' do
    it 'returns resolved value' do
      resolver.add_process_env('APP_NAME' => 'TestApp', 'PORT' => '8080')
      env = Ter::Runtime::Environment.new(schema, resolver)

      expect(env.get('APP_NAME')).to eq('TestApp')
      expect(env.get('PORT')).to eq(8080)
    end

    it 'raises for missing required value' do
      resolver.add_process_env({})
      expect { Ter::Runtime::Environment.new(schema, resolver) }.to raise_error(/validation failed/i)
    end

    it 'uses defaults' do
      resolver.add_process_env('APP_NAME' => 'TestApp')
      env = Ter::Runtime::Environment.new(schema, resolver)

      expect(env.get('PORT')).to eq(3000)
      expect(env.get('DEBUG')).to be false
    end
  end

  describe '#get_optional' do
    it 'returns value if present' do
      resolver.add_process_env('APP_NAME' => 'TestApp', 'API_KEY' => 'secret')
      env = Ter::Runtime::Environment.new(schema, resolver)

      expect(env.get_optional('API_KEY')).to eq('secret')
    end

    it 'returns nil if not present' do
      resolver.add_process_env('APP_NAME' => 'TestApp')
      env = Ter::Runtime::Environment.new(schema, resolver)

      expect(env.get_optional('API_KEY')).to be_nil
    end
  end

  describe 'type-safe getters' do
    before do
      resolver.add_process_env(
        'APP_NAME' => 'TestApp',
        'PORT' => '3000',
        'DEBUG' => 'true'
      )
    end

    it 'get_string returns string' do
      env = Ter::Runtime::Environment.new(schema, resolver)
      expect(env.get_string('APP_NAME')).to eq('TestApp')
    end

    it 'get_int returns integer' do
      env = Ter::Runtime::Environment.new(schema, resolver)
      expect(env.get_int('PORT')).to eq(3000)
      expect(env.get_int('PORT')).to be_a(Integer)
    end

    it 'get_boolean returns boolean' do
      env = Ter::Runtime::Environment.new(schema, resolver)
      expect(env.get_boolean('DEBUG')).to be true
    end

    it 'raises type mismatch' do
      env = Ter::Runtime::Environment.new(schema, resolver)
      expect { env.get_int('APP_NAME') }.to raise_error(/expected integer/i)
    end
  end

  describe '#is_secret?' do
    it 'returns true for secret type' do
      resolver.add_process_env('APP_NAME' => 'TestApp', 'API_KEY' => 'secret')
      env = Ter::Runtime::Environment.new(schema, resolver)

      expect(env.is_secret?('API_KEY')).to be true
      expect(env.is_secret?('APP_NAME')).to be false
    end
  end

  describe '#to_h' do
    it 'returns hash with redacted secrets' do
      resolver.add_process_env('APP_NAME' => 'TestApp', 'API_KEY' => 'secret123', 'PORT' => '3000')
      env = Ter::Runtime::Environment.new(schema, resolver)

      hash = env.to_h
      expect(hash['APP_NAME']).to eq('TestApp')
      expect(hash['API_KEY']).to eq('[REDACTED]')
      expect(hash['PORT']).to eq(3000)
    end
  end

  describe '#get_metadata' do
    it 'tracks source of values' do
      resolver.add_file_env('APP_NAME' => 'FileApp')
      resolver.add_process_env('PORT' => '4000')
      env = Ter::Runtime::Environment.new(schema, resolver)

      app_metadata = env.get_metadata('APP_NAME')
      expect(app_metadata[:source]).to eq('file')

      port_metadata = env.get_metadata('PORT')
      expect(port_metadata[:source]).to eq('process')
    end

    it 'tracks resolution time' do
      resolver.add_process_env('APP_NAME' => 'TestApp')
      before_time = Time.now.to_i
      env = Ter::Runtime::Environment.new(schema, resolver)
      after_time = Time.now.to_i

      metadata = env.get_metadata('APP_NAME')
      expect(metadata[:resolved_at]).to be >= before_time
      expect(metadata[:resolved_at]).to be <= after_time
    end
  end

  describe '#validate' do
    it 'validates environment' do
      resolver.add_process_env('APP_NAME' => 'TestApp')
      env = Ter::Runtime::Environment.new(schema, resolver)

      result = env.validate
      expect(result[:valid]).to be true
    end
  end

  describe 'source priority' do
    it 'prioritizes process over file over injected' do
      resolver.add_injected('APP_NAME' => 'InjectedApp')
      resolver.add_file_env('APP_NAME' => 'FileApp')
      resolver.add_process_env('APP_NAME' => 'ProcessApp')
      env = Ter::Runtime::Environment.new(schema, resolver)

      expect(env.get('APP_NAME')).to eq('ProcessApp')
      expect(env.get_metadata('APP_NAME')[:source]).to eq('process')
    end

    it 'uses file value if process not set' do
      resolver.add_injected('APP_NAME' => 'InjectedApp')
      resolver.add_file_env('APP_NAME' => 'FileApp')
      env = Ter::Runtime::Environment.new(schema, resolver)

      expect(env.get('APP_NAME')).to eq('FileApp')
      expect(env.get_metadata('APP_NAME')[:source]).to eq('file')
    end

    it 'uses injected value as fallback' do
      resolver.add_injected('APP_NAME' => 'InjectedApp')
      env = Ter::Runtime::Environment.new(schema, resolver)

      expect(env.get('APP_NAME')).to eq('InjectedApp')
      expect(env.get_metadata('APP_NAME')[:source]).to eq('injected')
    end

    it 'uses defaults last' do
      env = Ter::Runtime::Environment.new(schema, resolver.add_process_env('APP_NAME' => 'Test'))
      expect(env.get('DEBUG')).to be false
      expect(env.get_metadata('DEBUG')[:source]).to eq('defaults')
    end
  end

  describe 'complex environments' do
    let(:complex_schema) do
      schema = Ter::Core::Schema.new
      schema.define('DATABASE_URL', Ter::Core::Types.url.mark_required)
      schema.define('REDIS_URL', Ter::Core::Types.url)
      schema.define('LOG_LEVEL', Ter::Core::Types.enum('debug', 'info', 'warn', 'error').default('info'))
      schema.define('MAX_CONNECTIONS', Ter::Core::Types.int.min(1).default(10))
      schema.define('CACHE_ENABLED', Ter::Core::Types.boolean.default(true))
      schema.define('CONFIG', Ter::Core::Types.json.default({}))
      schema
    end

    it 'handles complex configurations' do
      resolver = Ter::Runtime::Resolver.new(complex_schema)
      resolver.add_process_env(
        'DATABASE_URL' => 'postgresql://localhost/mydb',
        'REDIS_URL' => 'redis://localhost:6379',
        'LOG_LEVEL' => 'debug',
        'MAX_CONNECTIONS' => '50'
      )

      env = Ter::Runtime::Environment.new(complex_schema, resolver)

      expect(env.get('DATABASE_URL')).to eq('postgresql://localhost/mydb')
      expect(env.get('REDIS_URL')).to eq('redis://localhost:6379')
      expect(env.get('LOG_LEVEL')).to eq('debug')
      expect(env.get_int('MAX_CONNECTIONS')).to eq(50)
      expect(env.get_boolean('CACHE_ENABLED')).to be true
    end

    it 'validates all types correctly' do
      resolver = Ter::Runtime::Resolver.new(complex_schema)
      resolver.add_process_env('DATABASE_URL' => 'https://db.example.com:5432')

      env = Ter::Runtime::Environment.new(complex_schema, resolver)
      result = env.validate

      expect(result[:valid]).to be true
    end
  end
end
