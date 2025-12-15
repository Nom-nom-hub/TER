# frozen_string_literal: true

module Ter
  module Core
    # Base type class with validation and coercion
    class BaseType
      attr_reader :default_value, :required, :description

      def initialize
        @default_value = nil
        @required = false
        @description = ''
        @constraints = {}
      end

      # Mark as required
      def mark_required
        @required = true
        self
      end

      # Set default value
      def default(value)
        @default_value = value
        self
      end

      # Set description
      def describe(text)
        @description = text
        self
      end

      # Validate a value
      # Returns: { valid: true, value: coerced_value } or { valid: false, error: 'message' }
      def validate(value)
        raise NotImplementedError, 'Subclasses must implement validate'
      end

      # Coerce value to correct type
      def coerce(value)
        raise NotImplementedError, 'Subclasses must implement coerce'
      end

      protected

      def success(value)
        { valid: true, value: value }
      end

      def failure(error)
        { valid: false, error: error }
      end
    end

    # String type
    class StringType < BaseType
      def initialize
        super
        @min_length = nil
        @max_length = nil
        @pattern = nil
      end

      def min_length(length)
        @min_length = length
        self
      end

      def max_length(length)
        @max_length = length
        self
      end

      def pattern(regex)
        @pattern = regex
        self
      end

      def validate(value)
        return success(nil) if value.nil? && !@required
        return failure('Value is required') if value.nil? && @required

        coerced = coerce(value)
        return failure("Could not coerce to string: #{value.inspect}") if coerced.nil?

        if @min_length && coerced.length < @min_length
          return failure("String length must be at least #{@min_length}")
        end

        if @max_length && coerced.length > @max_length
          return failure("String length must be at most #{@max_length}")
        end

        if @pattern && !coerced.match?(@pattern)
          return failure("String does not match pattern #{@pattern.inspect}")
        end

        success(coerced)
      end

      def coerce(value)
        return value if value.is_a?(String)
        return nil if value.nil?
        value.to_s
      end
    end

    # Integer type
    class IntType < BaseType
      def initialize
        super
        @min_value = nil
        @max_value = nil
      end

      def min(value)
        @min_value = value
        self
      end

      def max(value)
        @max_value = value
        self
      end

      def validate(value)
        return success(nil) if value.nil? && !@required
        return failure('Value is required') if value.nil? && @required

        coerced = coerce(value)
        return failure("Could not coerce to integer: #{value.inspect}") if coerced.nil?

        if @min_value && coerced < @min_value
          return failure("Integer must be at least #{@min_value}")
        end

        if @max_value && coerced > @max_value
          return failure("Integer must be at most #{@max_value}")
        end

        success(coerced)
      end

      def coerce(value)
        return value if value.is_a?(Integer)
        return nil if value.nil?
        return Integer(value, 10) if value.is_a?(String)
        nil
      rescue ArgumentError
        nil
      end
    end

    # Number (float) type
    class NumberType < BaseType
      def initialize
        super
        @min_value = nil
        @max_value = nil
      end

      def min(value)
        @min_value = value
        self
      end

      def max(value)
        @max_value = value
        self
      end

      def validate(value)
        return success(nil) if value.nil? && !@required
        return failure('Value is required') if value.nil? && @required

        coerced = coerce(value)
        return failure("Could not coerce to number: #{value.inspect}") if coerced.nil?

        if @min_value && coerced < @min_value
          return failure("Number must be at least #{@min_value}")
        end

        if @max_value && coerced > @max_value
          return failure("Number must be at most #{@max_value}")
        end

        success(coerced)
      end

      def coerce(value)
        return value if value.is_a?(Float)
        return value.to_f if value.is_a?(Integer)
        return nil if value.nil?
        return Float(value) if value.is_a?(String)
        nil
      rescue ArgumentError
        nil
      end
    end

    # Boolean type
    class BooleanType < BaseType
      def validate(value)
        return success(nil) if value.nil? && !@required
        return failure('Value is required') if value.nil? && @required

        coerced = coerce(value)
        return failure("Could not coerce to boolean: #{value.inspect}") if coerced.nil?

        success(coerced)
      end

      def coerce(value)
        return value if value.is_a?(TrueClass) || value.is_a?(FalseClass)
        return nil if value.nil?
        return true if value.is_a?(String) && %w[true 1 yes].include?(value.downcase)
        return false if value.is_a?(String) && %w[false 0 no].include?(value.downcase)
        nil
      end
    end

    # Enum type
    class EnumType < BaseType
      def initialize(allowed_values)
        super()
        @allowed_values = allowed_values
      end

      def validate(value)
        return success(nil) if value.nil? && !@required
        return failure('Value is required') if value.nil? && @required

        coerced = coerce(value)
        return failure("Could not coerce to enum: #{value.inspect}") if coerced.nil?

        unless @allowed_values.include?(coerced)
          return failure("Value must be one of: #{@allowed_values.join(', ')}")
        end

        success(coerced)
      end

      def coerce(value)
        return value if value.is_a?(String) && @allowed_values.include?(value)
        return nil if value.nil?
        return value.to_s if @allowed_values.include?(value.to_s)
        nil
      end

      def allowed_values
        @allowed_values.dup
      end
    end

    # URL type
    class URLType < BaseType
      def validate(value)
        return success(nil) if value.nil? && !@required
        return failure('Value is required') if value.nil? && @required

        coerced = coerce(value)
        return failure("Could not coerce to URL: #{value.inspect}") if coerced.nil?

        begin
          uri = URI.parse(coerced)
          return failure('Invalid URL') unless uri.is_a?(URI::HTTP) || uri.is_a?(URI::HTTPS)
        rescue URI::InvalidURIError
          return failure('Invalid URL format')
        end

        success(coerced)
      end

      def coerce(value)
        return value if value.is_a?(String)
        return nil if value.nil?
        value.to_s
      end
    end

    # JSON type
    class JSONType < BaseType
      def validate(value)
        return success(nil) if value.nil? && !@required
        return failure('Value is required') if value.nil? && @required

        coerced = coerce(value)
        return failure("Could not coerce to JSON: #{value.inspect}") if coerced.nil?

        success(coerced)
      end

      def coerce(value)
        return value if value.is_a?(Hash) || value.is_a?(Array)
        return nil if value.nil?
        return JSON.parse(value) if value.is_a?(String)
        nil
      rescue JSON::ParserError
        nil
      end
    end

    # Secret type (marked for sensitive handling)
    class SecretType < BaseType
      def initialize
        super
        @pattern = nil
      end

      def pattern(regex)
        @pattern = regex
        self
      end

      def validate(value)
        return success(nil) if value.nil? && !@required
        return failure('Value is required') if value.nil? && @required

        coerced = coerce(value)
        return failure("Could not coerce to secret: #{value.inspect}") if coerced.nil?

        if @pattern && !coerced.match?(@pattern)
          return failure("Secret does not match pattern #{@pattern.inspect}")
        end

        success(coerced)
      end

      def coerce(value)
        return value if value.is_a?(String)
        return nil if value.nil?
        value.to_s
      end

      def secret?
        true
      end
    end

    # Type factory
    module Types
      def self.string
        StringType.new
      end

      def self.int
        IntType.new
      end

      def self.number
        NumberType.new
      end

      def self.boolean
        BooleanType.new
      end

      def self.enum(*allowed_values)
        EnumType.new(allowed_values)
      end

      def self.url
        URLType.new
      end

      def self.json
        JSONType.new
      end

      def self.secret
        SecretType.new
      end
    end
  end
end

require 'uri'
require 'json'
