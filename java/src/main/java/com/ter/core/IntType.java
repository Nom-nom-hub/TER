package com.ter.core;

public class IntType extends BaseType {
    private Integer minValue;
    private Integer maxValue;

    public IntType min(int value) {
        this.minValue = value;
        return this;
    }

    public IntType max(int value) {
        this.maxValue = value;
        return this;
    }

    @Override
    public ValidationResult validate(Object value) {
        if (value == null && !required) {
            return success(null);
        }
        if (value == null && required) {
            return failure("Value is required");
        }

        Integer coerced = (Integer) coerce(value);
        if (coerced == null) {
            return failure("Could not coerce to integer: " + value);
        }

        if (minValue != null && coerced < minValue) {
            return failure("Integer must be at least " + minValue);
        }

        if (maxValue != null && coerced > maxValue) {
            return failure("Integer must be at most " + maxValue);
        }

        return success(coerced);
    }

    @Override
    protected Object coerce(Object value) {
        if (value instanceof Integer) {
            return value;
        }
        if (value == null) {
            return null;
        }
        if (value instanceof String) {
            try {
                return Integer.parseInt((String) value, 10);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return null;
    }
}
