# frozen_string_literal: true

module Ter
  module Adapters
    # DotEnv file parsing and generation
    class DotEnv
      # Parse .env file content
      def self.parse(content)
        result = {}
        current_key = nil
        current_value = ''
        in_multiline = false

        lines = content.split("\n")

        lines.each do |line|
          # Handle multiline heredoc
          if in_multiline
            if line.strip == 'EOF'
              result[current_key] = current_value.rstrip
              in_multiline = false
              current_value = ''
            else
              current_value += line + "\n"
            end
            next
          end

          # Handle line continuation
          if current_key && line.end_with?('\\')
            current_value += line[0..-2] + "\n"
            next
          end

          if current_key && !line.start_with?(/\s*#/) && !line.include?('=')
            current_value += line + "\n"
            next
          end

          # Store previous key-value
          if current_key && current_value
            result[current_key] = current_value.rstrip
            current_key = nil
            current_value = ''
          end

          # Skip comments and empty lines
          next if line.strip.empty? || line.strip.start_with?('#')

          # Parse new key-value
          if line.include?('=')
            key, value = line.split('=', 2)
            key = key.strip

            # Check for heredoc
            if value.strip.start_with?('<<')
              in_multiline = true
              current_key = key
              current_value = ''
            else
              # Remove quotes and handle escapes
              value = unescape_value(value.strip)
              result[key] = value
            end
          end
        end

        # Store final key-value
        result[current_key] = current_value.rstrip if current_key && current_value

        result
      end

      # Generate .env file content
      def self.generate(values)
        lines = []

        values.each do |key, value|
          lines << "#{key}=#{escape_value(value)}"
        end

        lines.join("\n")
      end

      # Escape a value for .env format
      def self.escape_value(value)
        return '""' if value.nil? || value.empty?

        # Use quotes for values with special characters
        if value.include?("\n") || value.include?('"') || value.include?('\\') || value.include?('$')
          escaped = value.gsub('\\', '\\\\').gsub('"', '\\"').gsub('$', '\$')
          "\"#{escaped}\""
        else
          value
        end
      end

      # Unescape a value from .env format
      def self.unescape_value(value)
        return '' if value.nil? || value.empty?

        # Handle quoted values
        if (value.start_with?('"') && value.end_with?('"')) ||
           (value.start_with?("'") && value.end_with?("'"))
          # Remove quotes
          inner = value[1..-2]
          # Unescape
          inner.gsub('\\n', "\n").gsub('\\t', "\t").gsub('\\\\', '\\').gsub('\\"', '"')
        else
          value
        end
      end

      # Load from file
      def self.load_file(path)
        raise "File not found: #{path}" unless File.exist?(path)
        content = File.read(path)
        parse(content)
      end

      # Save to file
      def self.save_file(path, values)
        content = generate(values)
        File.write(path, content)
      end
    end
  end
end
