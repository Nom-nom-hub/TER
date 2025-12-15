# frozen_string_literal: true

module Ter
  module Core
    # Validation utilities
    class Validation
      # Validate multiple values against schema
      def self.validate_all(schema, values = {})
        results = {}
        errors = []

        schema.get_variables.each do |name, type|
          value = values[name]

          # Use default if not provided
          if value.nil? && !type.default_value.nil?
            value = type.default_value
          end

          result = type.validate(value)

          if result[:valid]
            results[name] = result[:value]
          else
            errors << { field: name, error: result[:error] }
          end
        end

        {
          valid: errors.empty?,
          values: results,
          errors: errors
        }
      end

      # Check if all required variables are present
      def self.check_required(schema, values = {})
        missing = []

        schema.get_variables.each do |name, type|
          if type.required && values[name].nil? && type.default_value.nil?
            missing << name
          end
        end

        { valid: missing.empty?, missing: missing }
      end
    end
  end
end
