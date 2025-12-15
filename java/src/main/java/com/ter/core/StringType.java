package com.ter.core;

import java.util.regex.Pattern;

public class StringType extends BaseType {
    private Integer minLength;
    private Integer maxLength;
    private Pattern pattern;

    public StringType minLength(int length) {
        this.minLength = length;
        return this;
    }

    public StringType maxLength(int length) {
        this.maxLength = length;
        return this;
    }

    public StringType pattern(Pattern regex) {
        this.pattern = regex;
        return this;
    }

    public StringType pattern(String regex) {
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
            return failure("Could not coerce to string: " + value);
        }

        if (minLength != null && coerced.length() < minLength) {
            return failure("String length must be at least " + minLength);
        }

        if (maxLength != null && coerced.length() > maxLength) {
            return failure("String length must be at most " + maxLength);
        }

        if (pattern != null && !pattern.matcher(coerced).matches()) {
            return failure("String does not match pattern " + pattern.pattern());
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
}
