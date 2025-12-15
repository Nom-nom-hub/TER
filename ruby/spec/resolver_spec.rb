# frozen_string_literal: true

require 'spec_helper'

describe Ter::Runtime::Resolver do
  let(:schema) do
    schema = Ter::Core::Schema.new
    schema.define('VAR1', Ter::Core::Types.string.mark_required)
    schema.define('VAR2', Ter::Core::Types.int.default(100))
    schema.define('VAR3', Ter::Core::Types.string)
    schema
  end

  let(:resolver) { Ter::Runtime::Resolver.new(schema) }

  describe '#add_process_env' do
    it 'adds process environment variables' do
      resolver.add_process_env('VAR1' => 'process_value')
      result = resolver.resolve

      expect(result[:values]['VAR1']).to eq('process_value')
    end

    it 'uses ENV by default' do
      allow(ENV).to receive(:[]).and_return('VAR1' => 'env_value')
      resolver.add_process_env
      result = resolver.resolve

      expect(result[:valid]).to be true
    end
  end

  describe '#add_file_env' do
    it 'adds file environment variables' do
      resolver.add_file_env('VAR1' => 'file_value')
      result = resolver.resolve

      expect(result[:values]['VAR1']).to eq('file_value')
    end

    it 'handles nil values' do
      expect { resolver.add_file_env(nil) }.not_to raise_error
    end
  end

  describe '#add_injected' do
    it 'adds injected values' do
      resolver.add_injected('VAR1' => 'injected_value')
      result = resolver.resolve

      expect(result[:values]['VAR1']).to eq('injected_value')
    end
  end

  describe 'priority ordering' do
    it 'prioritizes process > file > injected > defaults' do
      resolver.add_injected('VAR1' => 'injected')
      resolver.add_file_env('VAR1' => 'file')
      resolver.add_process_env('VAR1' => 'process')

      result = resolver.resolve
      expect(result[:values]['VAR1']).to eq('process')
    end

    it 'falls back to file when process not set' do
      resolver.add_injected('VAR1' => 'injected')
      resolver.add_file_env('VAR1' => 'file')

      result = resolver.resolve
      expect(result[:values]['VAR1']).to eq('file')
    end

    it 'falls back to injected when file not set' do
      resolver.add_injected('VAR1' => 'injected')
      result = resolver.resolve
      expect(result[:values]['VAR1']).to eq('injected')
    end

    it 'uses defaults when nothing else set' do
      result = resolver.resolve
      expect(result[:values]['VAR2']).to eq(100)
    end
  end

  describe '#resolve' do
    it 'returns valid result' do
      resolver.add_process_env('VAR1' => 'value1')
      result = resolver.resolve

      expect(result[:valid]).to be true
      expect(result[:values]).to be_a(Hash)
      expect(result[:errors]).to be_empty
    end

    it 'collects validation errors' do
      resolver.add_process_env('VAR1' => nil)
      result = resolver.resolve

      expect(result[:valid]).to be false
      expect(result[:errors]).to have_at_least(1).item
    end

    it 'coerces values to correct types' do
      resolver.add_process_env('VAR1' => 'string_value', 'VAR2' => '200')
      result = resolver.resolve

      expect(result[:values]['VAR1']).to be_a(String)
      expect(result[:values]['VAR2']).to be_a(Integer)
      expect(result[:values]['VAR2']).to eq(200)
    end
  end

  describe '#get_metadata' do
    it 'tracks source of each variable' do
      resolver.add_file_env('VAR1' => 'file_value')
      resolver.add_process_env('VAR2' => '200')

      _result = resolver.resolve
      metadata1 = resolver.get_metadata('VAR1')
      metadata2 = resolver.get_metadata('VAR2')

      expect(metadata1[:source]).to eq('file')
      expect(metadata2[:source]).to eq('process')
    end

    it 'tracks resolution time' do
      resolver.add_process_env('VAR1' => 'value')
      before = Time.now.to_i
      resolver.resolve
      after = Time.now.to_i

      metadata = resolver.get_metadata('VAR1')
      expect(metadata[:resolved_at]).to be >= before
      expect(metadata[:resolved_at]).to be <= after
    end

    it 'returns empty hash for unknown variables' do
      resolver.add_process_env('VAR1' => 'value')
      resolver.resolve

      metadata = resolver.get_metadata('UNKNOWN')
      expect(metadata).to eq({})
    end
  end

  describe '#get_all_metadata' do
    it 'returns metadata for all variables' do
      resolver.add_process_env('VAR1' => 'value1')
      resolver.add_file_env('VAR2' => 200)

      resolver.resolve
      all_metadata = resolver.get_all_metadata

      expect(all_metadata).to have_key('VAR1')
      expect(all_metadata).to have_key('VAR2')
      expect(all_metadata['VAR1'][:source]).to eq('process')
      expect(all_metadata['VAR2'][:source]).to eq('file')
    end
  end

  describe 'chaining' do
    it 'allows method chaining' do
      result = resolver
        .add_process_env('VAR1' => 'process')
        .add_file_env('VAR2' => '150')
        .resolve

      expect(result[:valid]).to be true
      expect(result[:values]['VAR1']).to eq('process')
      expect(result[:values]['VAR2']).to eq(150)
    end
  end

  describe 'complex resolution' do
    let(:complex_schema) do
      schema = Ter::Core::Schema.new
      schema.define('APP_NAME', Ter::Core::Types.string.mark_required)
      schema.define('ENV', Ter::Core::Types.enum('dev', 'prod').mark_required)
      schema.define('PORT', Ter::Core::Types.int.min(1).max(65535).default(3000))
      schema.define('DEBUG', Ter::Core::Types.boolean.default(false))
      schema.define('HOSTS', Ter::Core::Types.json.default([]))
      schema
    end

    it 'resolves complex schemas from multiple sources' do
      resolver = Ter::Runtime::Resolver.new(complex_schema)
      resolver.add_injected(
        'APP_NAME' => 'DefaultApp',
        'ENV' => 'dev',
        'HOSTS' => [{ 'name' => 'localhost' }]
      )
      resolver.add_file_env(
        'APP_NAME' => 'FileApp',
        'ENV' => 'prod'
      )
      resolver.add_process_env(
        'PORT' => '8080',
        'DEBUG' => 'true'
      )

      result = resolver.resolve

      expect(result[:valid]).to be true
      expect(result[:values]['APP_NAME']).to eq('FileApp')  # file > injected
      expect(result[:values]['ENV']).to eq('prod')
      expect(result[:values]['PORT']).to eq(8080)
      expect(result[:values]['DEBUG']).to be true
    end
  end
end
