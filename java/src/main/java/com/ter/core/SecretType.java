package com.ter.core;

import java.util.regex.Pattern;

public class SecretType extends BaseType {
    private Pattern pattern;

    public SecretType pattern(Pattern regex) {
        this.pattern = regex;
        return this;
    }

    public SecretType pattern(String regex) {
        this.pattern = Pattern.compile(regex);
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

        String coerced = (String) coerce(value);
        if (coerced == null) {
            return failure("Could not coerce to secret: " + value);
        }

        if (pattern != null && !pattern.matcher(coerced).matches()) {
            return failure("Secret does not match pattern " + pattern.pattern());
        }

        return success(coerced);
    }

    @Override
    protected Object coerce(Object value) {
        if (value instanceof String) {
            return value;
        }
        if (value == null) {
            return null;
        }
        return value.toString();
    }

    public boolean isSecret() {
        return true;
    }
}
