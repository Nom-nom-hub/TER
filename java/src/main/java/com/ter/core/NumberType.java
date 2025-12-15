package com.ter.core;

public class NumberType extends BaseType {
    private Double minValue;
    private Double maxValue;

    public NumberType min(double value) {
        this.minValue = value;
        return this;
    }

    public NumberType max(double value) {
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

        Double coerced = (Double) coerce(value);
        if (coerced == null) {
            return failure("Could not coerce to number: " + value);
        }

        if (minValue != null && coerced < minValue) {
            return failure("Number must be at least " + minValue);
        }

        if (maxValue != null && coerced > maxValue) {
            return failure("Number must be at most " + maxValue);
        }

        return success(coerced);
    }

    @Override
    protected Object coerce(Object value) {
        if (value instanceof Double) {
            return value;
        }
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        if (value instanceof String) {
            try {
                return Double.parseDouble((String) value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
