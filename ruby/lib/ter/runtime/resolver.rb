# frozen_string_literal: true

module Ter
  module Runtime
    # Resolves values from multiple sources with priority ordering
    class Resolver
      SOURCES = {
        process: 3,
        file: 2,
        injected: 1,
        defaults: 0
      }.freeze

      attr_reader :schema

      def initialize(schema)
        @schema = schema
        @sources = {
          process: {},
          file: {},
          injected: {},
          defaults: {}
        }
        @metadata = {}
      end

      # Add process environment variables
      def add_process_env(env = ENV)
        @sources[:process] = env.to_h
        self
      end

      # Add values from file
      def add_file_env(values)
        @sources[:file] = values || {}
        self
      end

      # Add injected values
      def add_injected(values)
        @sources[:injected] = values || {}
        self
      end

      # Resolve all values
      def resolve
        results = {}
        errors = []

        @schema.get_variables.each do |name, type|
          value = find_value(name)

          # Use default if not found
          if value.nil?
            if !type.default_value.nil?
              value = type.default_value
              @metadata[name] = {
                source: 'defaults',
                resolved_at: Time.now.to_i
              }
            end
          end

          result = type.validate(value)

          if result[:valid]
            results[name] = result[:value]
            @metadata[name] ||= {
              source: find_source(name),
              resolved_at: Time.now.to_i
            }
          else
            errors << { field: name, error: result[:error] }
          end
        end

        {
          valid: errors.empty?,
          values: results,
          errors: errors,
          metadata: @metadata
        }
      end

      # Get metadata for a variable
      def get_metadata(name)
        @metadata[name] || {}
      end

      # Get all metadata
      def get_all_metadata
        @metadata.dup
      end

      private

      def find_value(name)
        # Priority: process > file > injected > defaults
        SOURCES.keys.each do |source|
          value = @sources[source][name]
          return value unless value.nil?
        end
        nil
      end

      def find_source(name)
        SOURCES.keys.reverse.each do |source|
          return source.to_s if @sources[source][name]
        end
        'unknown'
      end
    end
  end
end
