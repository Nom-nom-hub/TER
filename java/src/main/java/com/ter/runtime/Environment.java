package com.ter.runtime;

import com.ter.core.Schema;
import com.ter.core.SecretType;

import java.util.HashMap;
import java.util.Map;

/**
 * Runtime environment for accessing validated variables.
 */
public class Environment {
    private final Schema schema;
    private final Map<String, Object> values;
    private final Map<String, Resolver.ResolutionMetadata> metadata;

    public Environment(Schema schema, Resolver resolver) {
        this.schema = schema;
        Resolver.ResolutionResult result = resolver.resolve();

        if (!result.valid) {
            throw new IllegalArgumentException("Environment validation failed: " + result.error);
        }

        this.values = result.values;
        this.metadata = result.metadata;
    }

    /**
     * Get value by key (throws if not found).
     */
    public Object get(String key) {
        if (!values.containsKey(key)) {
            throw new IllegalArgumentException("Variable '" + key + "' not found");
        }
        return values.get(key);
    }

    /**
     * Get value by key, returns null if not found.
     */
    public Object getOptional(String key) {
        return values.getOrDefault(key, null);
    }

    /**
     * Type-safe getters.
     */
    public String getString(String key) {
        Object value = get(key);
        if (!(value instanceof String)) {
            throw new IllegalArgumentException("Expected string for " + key + ", got " + value.getClass().getSimpleName());
        }
        return (String) value;
    }

    public int getInt(String key) {
        Object value = get(key);
        if (!(value instanceof Integer)) {
            throw new IllegalArgumentException("Expected integer for " + key + ", got " + value.getClass().getSimpleName());
        }
        return (Integer) value;
    }

    public double getNumber(String key) {
        Object value = get(key);
        if (!(value instanceof Double)) {
            throw new IllegalArgumentException("Expected number for " + key + ", got " + value.getClass().getSimpleName());
        }
        return (Double) value;
    }

    public boolean getBoolean(String key) {
        Object value = get(key);
        if (!(value instanceof Boolean)) {
            throw new IllegalArgumentException("Expected boolean for " + key + ", got " + value.getClass().getSimpleName());
        }
        return (Boolean) value;
    }

    /**
     * Check if variable is a secret.
     */
    public boolean isSecret(String key) {
        com.ter.core.BaseType type = schema.getVariable(key);
        return type instanceof SecretType;
    }

    /**
     * Get metadata for variable.
     */
    public Resolver.ResolutionMetadata getMetadata(String key) {
        return metadata.getOrDefault(key, new Resolver.ResolutionMetadata("unknown", 0));
    }

    /**
     * Convert to map (secrets redacted).
     */
    public Map<String, Object> toMap() {
        Map<String, Object> result = new HashMap<>();
        for (Map.Entry<String, Object> entry : values.entrySet()) {
            if (isSecret(entry.getKey())) {
                result.put(entry.getKey(), "[REDACTED]");
            } else {
                result.put(entry.getKey(), entry.getValue());
            }
        }
        return result;
    }
}
