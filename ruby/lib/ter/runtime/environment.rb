# frozen_string_literal: true

module Ter
  module Runtime
    # Runtime environment for accessing validated variables
    class Environment
      attr_reader :schema, :metadata

      def initialize(schema, resolver)
        @schema = schema
        @resolver = resolver
        @resolved = resolver.resolve
        @metadata = @resolved[:metadata]

        unless @resolved[:valid]
          errors = @resolved[:errors].map { |e| "#{e[:field]}: #{e[:error]}" }
          raise "Environment validation failed: #{errors.join('; ')}"
        end

        @values = @resolved[:values]
      end

      # Get value by key (raises if not found)
      def get(key)
        raise "Variable '#{key}' not found" unless @values.key?(key)
        @values[key]
      end

      # Get value by key, returns nil if not found
      def get_optional(key)
        @values[key]
      end

      # Type-safe getters
      def get_string(key)
        value = get(key)
        raise "Expected string for #{key}, got #{value.class}" unless value.is_a?(String)
        value
      end

      def get_int(key)
        value = get(key)
        raise "Expected integer for #{key}, got #{value.class}" unless value.is_a?(Integer)
        value
      end

      def get_number(key)
        value = get(key)
        raise "Expected number for #{key}, got #{value.class}" unless value.is_a?(Float)
        value
      end

      def get_boolean(key)
        value = get(key)
        raise "Expected boolean for #{key}, got #{value.class}" unless [TrueClass, FalseClass].include?(value.class)
        value
      end

      def get_json(key)
        value = get(key)
        raise "Expected JSON (Hash/Array) for #{key}, got #{value.class}" unless value.is_a?(Hash) || value.is_a?(Array)
        value
      end

      # Check if variable is a secret
      def is_secret?(key)
        type = @schema.get_variable(key)
        type&.is_a?(Core::SecretType) || false
      end

      # Get metadata for variable
      def get_metadata(key)
        @metadata[key] || {}
      end

      # Get resolved values as hash
      def to_h
        result = {}
        @values.each do |key, value|
          result[key] = is_secret?(key) ? '[REDACTED]' : value
        end
        result
      end

      # Get all values (internal use)
      def to_h_internal
        @values.dup
      end

      # Validate environment
      def validate
        error_details = []
        @schema.get_variables.each do |name, type|
          value = @values[name]
          result = type.validate(value)
          error_details << "#{name}: #{result[:error]}" unless result[:valid]
        end

        { valid: error_details.empty?, errors: error_details }
      end
    end
  end
end
