# frozen_string_literal: true

require 'spec_helper'
require 'tempfile'

describe Ter::Adapters::DotEnv do
  describe '#parse' do
    it 'parses simple key=value pairs' do
      content = "KEY1=value1\nKEY2=value2"
      result = Ter::Adapters::DotEnv.parse(content)

      expect(result['KEY1']).to eq('value1')
      expect(result['KEY2']).to eq('value2')
    end

    it 'ignores comments' do
      content = "# This is a comment\nKEY=value\n# Another comment"
      result = Ter::Adapters::DotEnv.parse(content)

      expect(result['KEY']).to eq('value')
      expect(result.size).to eq(1)
    end

    it 'handles quoted values' do
      content = 'KEY1="quoted value"\nKEY2=\'single quoted\''
      result = Ter::Adapters::DotEnv.parse(content)

      expect(result['KEY1']).to eq('quoted value')
      expect(result['KEY2']).to eq('single quoted')
    end

    it 'handles line continuations with backslash' do
      content = "LONG_VALUE=this is a very \\\nlong value that continues"
      result = Ter::Adapters::DotEnv.parse(content)

      expect(result['LONG_VALUE']).to include('this is a very')
      expect(result['LONG_VALUE']).to include('long value that continues')
    end

    it 'handles heredoc syntax' do
      content = "CERT=<<EOF\n-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWg\n-----END CERTIFICATE-----\nEOF\n"
      result = Ter::Adapters::DotEnv.parse(content)

      expect(result['CERT']).to include('BEGIN CERTIFICATE')
      expect(result['CERT']).to include('END CERTIFICATE')
      expect(result['CERT']).to include('MIIDXTCCAkWg')
    end

    it 'skips empty lines' do
      content = "KEY1=value1\n\nKEY2=value2\n\n"
      result = Ter::Adapters::DotEnv.parse(content)

      expect(result.size).to eq(2)
      expect(result['KEY1']).to eq('value1')
      expect(result['KEY2']).to eq('value2')
    end

    it 'handles whitespace around keys' do
      content = "  KEY1  =  value1\nKEY2 = value2"
      result = Ter::Adapters::DotEnv.parse(content)

      expect(result['KEY1']).to eq('value1')
      expect(result['KEY2']).to eq('value2')
    end

    it 'preserves newlines in values' do
      content = "SCRIPT=line1 \\\nline2 \\\nline3"
      result = Ter::Adapters::DotEnv.parse(content)

      expect(result['SCRIPT']).to include('line1')
      expect(result['SCRIPT']).to include('line2')
      expect(result['SCRIPT']).to include('line3')
    end

    it 'handles special characters in quoted strings' do
      content = 'URL="https://example.com?key=value&other=test"'
      result = Ter::Adapters::DotEnv.parse(content)

      expect(result['URL']).to eq('https://example.com?key=value&other=test')
    end
  end

  describe '#generate' do
    it 'generates simple key=value pairs' do
      values = { 'KEY1' => 'value1', 'KEY2' => 'value2' }
      result = Ter::Adapters::DotEnv.generate(values)

      expect(result).to include('KEY1=value1')
      expect(result).to include('KEY2=value2')
    end

    it 'quotes values with special characters' do
      values = { 'QUOTED' => 'value with spaces' }
      result = Ter::Adapters::DotEnv.generate(values)

      expect(result).to include('"')
    end

    it 'handles empty values' do
      values = { 'EMPTY' => '' }
      result = Ter::Adapters::DotEnv.generate(values)

      expect(result).to include('EMPTY=')
    end

    it 'escapes quotes in values' do
      values = { 'QUOTED' => 'value with "quotes"' }
      result = Ter::Adapters::DotEnv.generate(values)

      expect(result).to include('\\"')
    end
  end

  describe '#escape_value' do
    it 'escapes special characters' do
      value = 'value with $VAR and "quotes"'
      escaped = Ter::Adapters::DotEnv.escape_value(value)

      expect(escaped).to include('\\$')
      expect(escaped).to include('\\"')
    end

    it 'handles nil and empty values' do
      expect(Ter::Adapters::DotEnv.escape_value(nil)).to eq('""')
      expect(Ter::Adapters::DotEnv.escape_value('')).to eq('""')
    end

    it 'preserves simple values' do
      value = 'simple_value'
      escaped = Ter::Adapters::DotEnv.escape_value(value)

      expect(escaped).to eq('simple_value')
    end
  end

  describe '#unescape_value' do
    it 'removes quotes' do
      value = '"quoted value"'
      unescaped = Ter::Adapters::DotEnv.unescape_value(value)

      expect(unescaped).to eq('quoted value')
      expect(unescaped).not_to include('"')
    end

    it 'handles escape sequences' do
      value = '"value\\nwith\\tnewlines"'
      unescaped = Ter::Adapters::DotEnv.unescape_value(value)

      expect(unescaped).to include("\n")
      expect(unescaped).to include("\t")
    end

    it 'preserves unquoted values' do
      value = 'unquoted'
      unescaped = Ter::Adapters::DotEnv.unescape_value(value)

      expect(unescaped).to eq('unquoted')
    end
  end

  describe 'round-trip' do
    it 'preserves values through parse -> generate -> parse cycle' do
      original = {
        'KEY1' => 'value1',
        'KEY2' => 'value with spaces',
        'KEY3' => 'https://example.com',
        'EMPTY' => ''
      }

      generated = Ter::Adapters::DotEnv.generate(original)
      parsed = Ter::Adapters::DotEnv.parse(generated)

      expect(parsed['KEY1']).to eq('value1')
      expect(parsed['KEY2']).to eq('value with spaces')
      expect(parsed['KEY3']).to eq('https://example.com')
    end
  end

  describe 'file operations' do
    it 'loads from file' do
      content = "KEY1=value1\nKEY2=value2"
      file = Tempfile.new('test.env')
      file.write(content)
      file.close

      result = Ter::Adapters::DotEnv.load_file(file.path)

      expect(result['KEY1']).to eq('value1')
      expect(result['KEY2']).to eq('value2')

      file.unlink
    end

    it 'saves to file' do
      values = { 'KEY1' => 'value1', 'KEY2' => 'value2' }
      file = Tempfile.new('test.env')
      file.close

      Ter::Adapters::DotEnv.save_file(file.path, values)
      content = File.read(file.path)

      expect(content).to include('KEY1=value1')
      expect(content).to include('KEY2=value2')

      file.unlink
    end

    it 'raises for non-existent file' do
      expect { Ter::Adapters::DotEnv.load_file('/non/existent/file.env') }
        .to raise_error('File not found')
    end
  end

  describe 'real-world examples' do
    it 'parses certificate values' do
      content = "CERT=<<EOF\n-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAJC1\n-----END CERTIFICATE-----\nEOF"
      result = Ter::Adapters::DotEnv.parse(content)

      expect(result['CERT']).to include('BEGIN CERTIFICATE')
      expect(result['CERT']).to include('MIIDXTCCAkWgAwIBAgIJAJC1')
    end

    it 'parses SQL migration scripts' do
      content = "MIGRATION=<<EOF\nCREATE TABLE users (\n  id INT PRIMARY KEY,\n  email VARCHAR(255)\n);\nEOF"
      result = Ter::Adapters::DotEnv.parse(content)

      expect(result['MIGRATION']).to include('CREATE TABLE')
      expect(result['MIGRATION']).to include('INT PRIMARY KEY')
    end

    it 'parses shell scripts' do
      content = "DEPLOY=<<EOF\n#!/bin/bash\nset -e\ndocker pull app\nEOF"
      result = Ter::Adapters::DotEnv.parse(content)

      expect(result['DEPLOY']).to include('#!/bin/bash')
      expect(result['DEPLOY']).to include('docker pull')
    end

    it 'parses JSON configurations' do
      content = 'CONFIG=\'{"key":"value","nested":{"deep":"value"}}\''
      result = Ter::Adapters::DotEnv.parse(content)

      expect(result['CONFIG']).to include('key')
      expect(result['CONFIG']).to include('value')
    end
  end
end
