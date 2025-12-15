package com.ter.core;

import java.util.HashMap;
import java.util.Map;
import java.util.LinkedHashMap;

/**
 * Schema definition for environment variables.
 */
public class Schema {
    private final Map<String, BaseType> variables = new LinkedHashMap<>();

    /**
     * Define a variable.
     */
    public <T extends BaseType> T define(String name, T type) {
        if (name == null || name.isEmpty()) {
            throw new IllegalArgumentException("Name must be non-empty");
        }
        if (type == null) {
            throw new IllegalArgumentException("Type cannot be null");
        }
        variables.put(name, type);
        return type;
    }

    /**
     * Get a variable definition.
     */
    public BaseType getVariable(String name) {
        return variables.get(name);
    }

    /**
     * Check if variable exists.
     */
    public boolean hasVariable(String name) {
        return variables.containsKey(name);
    }

    /**
     * Get all variables.
     */
    public Map<String, BaseType> getVariables() {
        return new HashMap<>(variables);
    }

    /**
     * Validate all variables.
     */
    public ValidationResult validateAll(Map<String, Object> values) {
        Map<String, Object> validatedValues = new HashMap<>();
        StringBuilder errorBuilder = new StringBuilder();
        boolean hasErrors = false;

        for (Map.Entry<String, BaseType> entry : variables.entrySet()) {
            String name = entry.getKey();
            BaseType type = entry.getValue();
            Object value = values.getOrDefault(name, null);

            BaseType.ValidationResult result = type.validate(value);

            if (result.valid) {
                validatedValues.put(name, result.value);
            } else {
                if (hasErrors) errorBuilder.append("; ");
                errorBuilder.append(name).append(": ").append(result.error);
                hasErrors = true;
            }
        }

        return new ValidationResult(
            !hasErrors,
            validatedValues,
            hasErrors ? errorBuilder.toString() : ""
        );
    }

    /**
     * Export schema to contract map.
     */
    public Map<String, Map<String, Object>> toContract() {
        Map<String, Map<String, Object>> contract = new LinkedHashMap<>();

        for (Map.Entry<String, BaseType> entry : variables.entrySet()) {
            String name = entry.getKey();
            BaseType type = entry.getValue();

            Map<String, Object> typeContract = new LinkedHashMap<>();
            typeContract.put("type", type.getClass().getSimpleName());

            if (type.isRequired()) {
                typeContract.put("required", true);
            }
            if (type.getDefaultValue() != null) {
                typeContract.put("default", type.getDefaultValue());
            }
            if (type.getDescription() != null && !type.getDescription().isEmpty()) {
                typeContract.put("description", type.getDescription());
            }

            // Type-specific constraints
            if (type instanceof IntType) {
                // Add min/max if available
            }

            contract.put(name, typeContract);
        }

        return contract;
    }

    /**
     * Validation result wrapper.
     */
    public static class ValidationResult {
        public final boolean valid;
        public final Map<String, Object> values;
        public final String error;

        public ValidationResult(boolean valid, Map<String, Object> values, String error) {
            this.valid = valid;
            this.values = values;
            this.error = error;
        }
    }
}
