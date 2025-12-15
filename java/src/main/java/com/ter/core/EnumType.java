package com.ter.core;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class EnumType extends BaseType {
    private final Set<String> allowedValues;

    public EnumType(String... values) {
        this.allowedValues = new HashSet<>(Arrays.asList(values));
    }

    @Override
    public ValidationResult validate(Object value) {
        if (value == null && !required) {
            return success(null);
        }
        if (value == null && required) {
            return failure("Value is required");
        }

        String coerced = (String) coerce(value);
        if (coerced == null) {
            return failure("Could not coerce to enum: " + value);
        }

        if (!allowedValues.contains(coerced)) {
            return failure("Value must be one of: " + String.join(", ", allowedValues));
        }

        return success(coerced);
    }

    @Override
    protected Object coerce(Object value) {
        if (value instanceof String && allowedValues.contains(value)) {
            return value;
        }
        if (value == null) {
            return null;
        }
        String str = value.toString();
        if (allowedValues.contains(str)) {
            return str;
        }
        return null;
    }

    public Set<String> getAllowedValues() {
        return new HashSet<>(allowedValues);
    }
}
