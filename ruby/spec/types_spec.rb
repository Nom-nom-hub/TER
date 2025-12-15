# frozen_string_literal: true

require 'spec_helper'

describe Ter::Core::Types do
  describe 'StringType' do
    let(:type) { Ter::Core::Types.string }

    it 'validates valid strings' do
      result = type.validate('hello')
      expect(result[:valid]).to be true
      expect(result[:value]).to eq('hello')
    end

    it 'coerces non-string values' do
      result = type.validate(123)
      expect(result[:valid]).to be true
      expect(result[:value]).to eq('123')
    end

    it 'fails for required missing values' do
      required_type = Ter::Core::Types.string.mark_required
      result = required_type.validate(nil)
      expect(result[:valid]).to be false
      expect(result[:error]).to match(/required/i)
    end

    it 'enforces min_length constraint' do
      min_type = Ter::Core::Types.string.min_length(5)
      result = min_type.validate('hi')
      expect(result[:valid]).to be false
      expect(result[:error]).to match(/length/)
    end

    it 'enforces max_length constraint' do
      max_type = Ter::Core::Types.string.max_length(3)
      result = max_type.validate('hello')
      expect(result[:valid]).to be false
      expect(result[:error]).to match(/length/)
    end

    it 'validates pattern matching' do
      pattern_type = Ter::Core::Types.string.pattern(/^\d+$/)
      expect(pattern_type.validate('123')[:valid]).to be true
      expect(pattern_type.validate('abc')[:valid]).to be false
    end

    it 'handles default values' do
      default_type = Ter::Core::Types.string.default('default_value')
      expect(default_type.default_value).to eq('default_value')
    end
  end

  describe 'IntType' do
    let(:type) { Ter::Core::Types.int }

    it 'validates integers' do
      result = type.validate(42)
      expect(result[:valid]).to be true
      expect(result[:value]).to eq(42)
    end

    it 'coerces string integers' do
      result = type.validate('42')
      expect(result[:valid]).to be true
      expect(result[:value]).to eq(42)
    end

    it 'rejects non-integer strings' do
      result = type.validate('abc')
      expect(result[:valid]).to be false
    end

    it 'enforces min constraint' do
      min_type = Ter::Core::Types.int.min(10)
      expect(min_type.validate(5)[:valid]).to be false
      expect(min_type.validate(15)[:valid]).to be true
    end

    it 'enforces max constraint' do
      max_type = Ter::Core::Types.int.max(100)
      expect(max_type.validate(150)[:valid]).to be false
      expect(max_type.validate(50)[:valid]).to be true
    end
  end

  describe 'NumberType' do
    let(:type) { Ter::Core::Types.number }

    it 'validates floats' do
      result = type.validate(3.14)
      expect(result[:valid]).to be true
      expect(result[:value]).to eq(3.14)
    end

    it 'coerces integers to floats' do
      result = type.validate(42)
      expect(result[:valid]).to be true
      expect(result[:value]).to eq(42.0)
    end

    it 'coerces string numbers' do
      result = type.validate('3.14')
      expect(result[:valid]).to be true
      expect(result[:value]).to eq(3.14)
    end

    it 'enforces min/max constraints' do
      bounded = Ter::Core::Types.number.min(0.0).max(10.0)
      expect(bounded.validate(-1.0)[:valid]).to be false
      expect(bounded.validate(5.0)[:valid]).to be true
      expect(bounded.validate(15.0)[:valid]).to be false
    end
  end

  describe 'BooleanType' do
    let(:type) { Ter::Core::Types.boolean }

    it 'validates true/false' do
      expect(type.validate(true)[:valid]).to be true
      expect(type.validate(false)[:valid]).to be true
    end

    it 'coerces string booleans' do
      expect(type.validate('true')[:value]).to be true
      expect(type.validate('false')[:value]).to be false
      expect(type.validate('1')[:value]).to be true
      expect(type.validate('0')[:value]).to be false
      expect(type.validate('yes')[:value]).to be true
      expect(type.validate('no')[:value]).to be false
    end

    it 'is case insensitive' do
      expect(type.validate('TRUE')[:value]).to be true
      expect(type.validate('FALSE')[:value]).to be false
    end
  end

  describe 'EnumType' do
    let(:type) { Ter::Core::Types.enum('dev', 'staging', 'prod') }

    it 'validates enum values' do
      expect(type.validate('dev')[:valid]).to be true
      expect(type.validate('prod')[:valid]).to be true
    end

    it 'rejects invalid enum values' do
      result = type.validate('invalid')
      expect(result[:valid]).to be false
      expect(result[:error]).to match(/one of/)
    end

    it 'provides allowed values' do
      expect(type.allowed_values).to include('dev', 'staging', 'prod')
    end
  end

  describe 'URLType' do
    let(:type) { Ter::Core::Types.url }

    it 'validates HTTP URLs' do
      expect(type.validate('http://example.com')[:valid]).to be true
    end

    it 'validates HTTPS URLs' do
      expect(type.validate('https://example.com')[:valid]).to be true
    end

    it 'rejects invalid URLs' do
      expect(type.validate('not a url')[:valid]).to be false
      expect(type.validate('ftp://example.com')[:valid]).to be false
    end

    it 'accepts complex URLs' do
      expect(type.validate('https://example.com:8080/path?query=1')[:valid]).to be true
    end
  end

  describe 'JSONType' do
    let(:type) { Ter::Core::Types.json }

    it 'validates JSON objects' do
      result = type.validate({ 'key' => 'value' })
      expect(result[:valid]).to be true
    end

    it 'validates JSON arrays' do
      result = type.validate([1, 2, 3])
      expect(result[:valid]).to be true
    end

    it 'parses JSON strings' do
      result = type.validate('{"key":"value"}')
      expect(result[:valid]).to be true
      expect(result[:value]).to be_a(Hash)
    end

    it 'rejects invalid JSON' do
      expect(type.validate('{invalid}')[:valid]).to be false
    end
  end

  describe 'SecretType' do
    let(:type) { Ter::Core::Types.secret }

    it 'validates secrets' do
      result = type.validate('secret_value')
      expect(result[:valid]).to be true
    end

    it 'is marked as secret' do
      expect(type.secret?).to be true
    end

    it 'supports pattern validation' do
      secret_type = Ter::Core::Types.secret.pattern(/^[a-z]+$/)
      expect(secret_type.validate('abc')[:valid]).to be true
      expect(secret_type.validate('123')[:valid]).to be false
    end
  end
end
