# frozen_string_literal: true

module Ter
  module Core
    # Schema definition for environment variables
    class Schema
      attr_reader :variables

      def initialize
        @variables = {}
      end

      # Define a variable
      def define(name, type)
        raise ArgumentError, 'Name must be a string' unless name.is_a?(String)
        raise ArgumentError, 'Type must be a BaseType' unless type.is_a?(BaseType)

        @variables[name] = type
        type
      end

      # Get a variable definition
      def get_variable(name)
        @variables[name]
      end

      # Check if variable exists
      def has_variable?(name)
        @variables.key?(name)
      end

      # Get all variables
      def get_variables
        @variables.dup
      end

      # Validate all variables against provided values
      def validate(values = {})
        errors = []

        @variables.each do |name, type|
          value = values[name]
          result = type.validate(value)

          unless result[:valid]
            errors << "#{name}: #{result[:error]}"
          end
        end

        { valid: errors.empty?, errors: errors }
      end

      # Export schema to JSON contract
      def to_contract
        contract = {}

        @variables.each do |name, type|
          contract[name] = type_to_contract(type)
        end

        contract
      end

      # Create schema from JSON contract
      def self.from_contract(contract)
        schema = new

        contract.each do |name, type_def|
          type = contract_to_type(type_def)
          schema.define(name, type)
        end

        schema
      end

      private

      def type_to_contract(type)
        contract = { type: type.class.name.split('::').last }

        contract[:required] = type.required if type.required
        contract[:default] = type.default_value unless type.default_value.nil?
        contract[:description] = type.description unless type.description.empty?

        case type
        when Types::IntType
          contract[:min] = type.instance_variable_get(:@min_value) if type.instance_variable_get(:@min_value)
          contract[:max] = type.instance_variable_get(:@max_value) if type.instance_variable_get(:@max_value)
        when Types::NumberType
          contract[:min] = type.instance_variable_get(:@min_value) if type.instance_variable_get(:@min_value)
          contract[:max] = type.instance_variable_get(:@max_value) if type.instance_variable_get(:@max_value)
        when Types::StringType
          contract[:minLength] = type.instance_variable_get(:@min_length) if type.instance_variable_get(:@min_length)
          contract[:maxLength] = type.instance_variable_get(:@max_length) if type.instance_variable_get(:@max_length)
          contract[:pattern] = type.instance_variable_get(:@pattern).source if type.instance_variable_get(:@pattern)
        when Types::EnumType
          contract[:enum] = type.allowed_values
        end

        contract
      end

      def self.contract_to_type(type_def)
        type_name = type_def['type']
        type = case type_name
                when 'StringType'
                  type = Types.string
                  type.min_length(type_def['minLength']) if type_def['minLength']
                  type.max_length(type_def['maxLength']) if type_def['maxLength']
                  type.pattern(Regexp.new(type_def['pattern'])) if type_def['pattern']
                  type
                when 'IntType'
                  type = Types.int
                  type.min(type_def['min']) if type_def['min']
                  type.max(type_def['max']) if type_def['max']
                  type
                when 'NumberType'
                  type = Types.number
                  type.min(type_def['min']) if type_def['min']
                  type.max(type_def['max']) if type_def['max']
                  type
                when 'BooleanType'
                  Types.boolean
                when 'EnumType'
                  Types.enum(*type_def['enum'])
                when 'URLType'
                  Types.url
                when 'JSONType'
                  Types.json
                when 'SecretType'
                  Types.secret
                else
                  raise "Unknown type: #{type_name}"
                end

        type.mark_required if type_def['required']
        type.default(type_def['default']) if type_def['default']
        type.describe(type_def['description']) if type_def['description']

        type
      end
    end
  end
end
