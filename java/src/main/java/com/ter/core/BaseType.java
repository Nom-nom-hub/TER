package com.ter.core;

import java.util.HashMap;
import java.util.Map;

/**
 * Base type class with validation and coercion.
 */
public abstract class BaseType {
    protected Object defaultValue = null;
    protected boolean required = false;
    protected String description = "";
    protected Map<String, Object> constraints = new HashMap<>();

    public BaseType markRequired() {
        this.required = true;
        return this;
    }

    public BaseType setDefault(Object value) {
        this.defaultValue = value;
        return this;
    }

    public BaseType describe(String text) {
        this.description = text;
        return this;
    }

    public Object getDefaultValue() {
        return defaultValue;
    }

    public boolean isRequired() {
        return required;
    }

    public String getDescription() {
        return description;
    }

    /**
     * Validate a value.
     * Returns: {valid: true, value: coercedValue} or {valid: false, error: "message"}
     */
    public abstract ValidationResult validate(Object value);

    /**
     * Coerce value to correct type.
     */
    protected abstract Object coerce(Object value);

    protected ValidationResult success(Object value) {
        return new ValidationResult(true, value, null);
    }

    protected ValidationResult failure(String error) {
        return new ValidationResult(false, null, error);
    }

    /**
     * Validation result wrapper.
     */
    public static class ValidationResult {
        public final boolean valid;
        public final Object value;
        public final String error;

        public ValidationResult(boolean valid, Object value, String error) {
            this.valid = valid;
            this.value = value;
            this.error = error;
        }
    }
}
