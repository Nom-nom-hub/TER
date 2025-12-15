package com.ter.adapters;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.LinkedHashMap;

/**
 * DotEnv file parsing and generation.
 */
public class DotEnv {
    /**
     * Parse .env file content.
     */
    public static Map<String, Object> parse(String content) {
        Map<String, Object> result = new LinkedHashMap<>();
        String[] lines = content.split("\n");
        String currentKey = null;
        StringBuilder currentValue = new StringBuilder();
        boolean inMultiline = false;

        for (String line : lines) {
            // Handle multiline heredoc
            if (inMultiline) {
                if (line.strip().equals("EOF")) {
                    result.put(currentKey, currentValue.toString().trim());
                    inMultiline = false;
                    currentValue = new StringBuilder();
                } else {
                    currentValue.append(line).append("\n");
                }
                continue;
            }

            // Handle line continuation
            if (currentKey != null && line.endsWith("\\")) {
                currentValue.append(line, 0, line.length() - 1).append("\n");
                continue;
            }

            // Store previous key-value
            if (currentKey != null && currentValue.length() > 0) {
                result.put(currentKey, currentValue.toString().trim());
                currentKey = null;
                currentValue = new StringBuilder();
            }

            // Skip comments and empty lines
            String trimmed = line.strip();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }

            // Parse new key-value
            if (line.contains("=")) {
                String[] parts = line.split("=", 2);
                String key = parts[0].strip();
                String value = parts.length > 1 ? parts[1].strip() : "";

                // Check for heredoc
                if (value.startsWith("<<")) {
                    inMultiline = true;
                    currentKey = key;
                } else {
                    value = unescapeValue(value);
                    result.put(key, value);
                }
            }
        }

        // Store final key-value
        if (currentKey != null && currentValue.length() > 0) {
            result.put(currentKey, currentValue.toString().trim());
        }

        return result;
    }

    /**
     * Load from file.
     */
    public static Map<String, Object> loadFile(String path) throws IOException {
        String content = Files.readString(Paths.get(path));
        return parse(content);
    }

    /**
     * Generate .env file content.
     */
    public static String generate(Map<String, Object> values) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Object> entry : values.entrySet()) {
            sb.append(entry.getKey()).append("=").append(escapeValue(entry.getValue())).append("\n");
        }
        return sb.toString();
    }

    /**
     * Save to file.
     */
    public static void saveFile(String path, Map<String, Object> values) throws IOException {
        String content = generate(values);
        Files.writeString(Paths.get(path), content);
    }

    /**
     * Escape a value for .env format.
     */
    public static String escapeValue(Object value) {
        if (value == null || value.toString().isEmpty()) {
            return "\"\"";
        }

        String str = value.toString();

        // Use quotes for values with special characters
        if (str.contains("\n") || str.contains("\"") || str.contains("\\") || str.contains("$")) {
            String escaped = str
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("$", "\\$");
            return "\"" + escaped + "\"";
        }

        return str;
    }

    /**
     * Unescape a value from .env format.
     */
    public static String unescapeValue(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }

        // Handle quoted values
        if ((value.startsWith("\"") && value.endsWith("\"")) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            String inner = value.substring(1, value.length() - 1);
            return inner
                .replace("\\n", "\n")
                .replace("\\t", "\t")
                .replace("\\\\", "\\")
                .replace("\\\"", "\"");
        }

        return value;
    }
}
