package com.ter.core;

public class BooleanType extends BaseType {
    @Override
    public ValidationResult validate(Object value) {
        if (value == null && !required) {
            return success(null);
        }
        if (value == null && required) {
            return failure("Value is required");
        }

        Boolean coerced = (Boolean) coerce(value);
        if (coerced == null) {
            return failure("Could not coerce to boolean: " + value);
        }

        return success(coerced);
    }

    @Override
    protected Object coerce(Object value) {
        if (value instanceof Boolean) {
            return value;
        }
        if (value == null) {
            return null;
        }
        if (value instanceof String) {
            String str = ((String) value).toLowerCase();
            if ("true".equals(str) || "1".equals(str) || "yes".equals(str)) {
                return true;
            }
            if ("false".equals(str) || "0".equals(str) || "no".equals(str)) {
                return false;
            }
        }
        return null;
    }
}
