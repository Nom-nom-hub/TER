package com.ter.runtime;

import com.ter.core.BaseType;
import com.ter.core.Schema;

import java.util.HashMap;
import java.util.Map;
import java.util.LinkedHashMap;

/**
 * Resolves values from multiple sources with priority ordering.
 */
public class Resolver {
    private final Schema schema;
    private final Map<String, Object> processEnv = new HashMap<>();
    private final Map<String, Object> fileEnv = new HashMap<>();
    private final Map<String, Object> injected = new HashMap<>();
    private final Map<String, ResolutionMetadata> metadata = new HashMap<>();

    private static final int PROCESS_PRIORITY = 3;
    private static final int FILE_PRIORITY = 2;
    private static final int INJECTED_PRIORITY = 1;
    private static final int DEFAULTS_PRIORITY = 0;

    public Resolver(Schema schema) {
        this.schema = schema;
    }

    /**
     * Add process environment variables.
     */
    public Resolver addProcessEnv(Map<String, Object> env) {
        if (env != null) {
            this.processEnv.putAll(env);
        }
        return this;
    }

    /**
     * Add values from file.
     */
    public Resolver addFileEnv(Map<String, Object> env) {
        if (env != null) {
            this.fileEnv.putAll(env);
        }
        return this;
    }

    /**
     * Add injected values.
     */
    public Resolver addInjected(Map<String, Object> values) {
        if (values != null) {
            this.injected.putAll(values);
        }
        return this;
    }

    /**
     * Resolve all values.
     */
    public ResolutionResult resolve() {
        Map<String, Object> results = new LinkedHashMap<>();
        StringBuilder errorBuilder = new StringBuilder();
        boolean hasErrors = false;

        for (Map.Entry<String, BaseType> entry : schema.getVariables().entrySet()) {
            String name = entry.getKey();
            BaseType type = entry.getValue();
            Object value = findValue(name);

            // Use default if not found
            if (value == null && type.getDefaultValue() != null) {
                value = type.getDefaultValue();
                metadata.put(name, new ResolutionMetadata("defaults", System.currentTimeMillis()));
            }

            BaseType.ValidationResult result = type.validate(value);

            if (result.valid) {
                results.put(name, result.value);
                if (!metadata.containsKey(name)) {
                    metadata.put(name, new ResolutionMetadata(findSource(name), System.currentTimeMillis()));
                }
            } else {
                if (hasErrors) errorBuilder.append("; ");
                errorBuilder.append(name).append(": ").append(result.error);
                hasErrors = true;
            }
        }

        return new ResolutionResult(
            !hasErrors,
            results,
            hasErrors ? errorBuilder.toString() : "",
            metadata
        );
    }

    /**
     * Get metadata for a variable.
     */
    public ResolutionMetadata getMetadata(String name) {
        return metadata.getOrDefault(name, new ResolutionMetadata("unknown", 0));
    }

    private Object findValue(String name) {
        if (processEnv.containsKey(name)) return processEnv.get(name);
        if (fileEnv.containsKey(name)) return fileEnv.get(name);
        if (injected.containsKey(name)) return injected.get(name);
        return null;
    }

    private String findSource(String name) {
        if (processEnv.containsKey(name)) return "process";
        if (fileEnv.containsKey(name)) return "file";
        if (injected.containsKey(name)) return "injected";
        return "unknown";
    }

    /**
     * Resolution metadata.
     */
    public static class ResolutionMetadata {
        public final String source;
        public final long resolvedAt;

        public ResolutionMetadata(String source, long resolvedAt) {
            this.source = source;
            this.resolvedAt = resolvedAt;
        }
    }

    /**
     * Resolution result wrapper.
     */
    public static class ResolutionResult {
        public final boolean valid;
        public final Map<String, Object> values;
        public final String error;
        public final Map<String, ResolutionMetadata> metadata;

        public ResolutionResult(boolean valid, Map<String, Object> values, String error, Map<String, ResolutionMetadata> metadata) {
            this.valid = valid;
            this.values = values;
            this.error = error;
            this.metadata = metadata;
        }
    }
}
