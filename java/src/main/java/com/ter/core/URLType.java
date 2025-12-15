package com.ter.core;

import java.net.URI;
import java.net.URISyntaxException;

public class URLType extends BaseType {
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
            return failure("Could not coerce to URL: " + value);
        }

        try {
            URI uri = new URI(coerced);
            String scheme = uri.getScheme();
            if (!"http".equals(scheme) && !"https".equals(scheme)) {
                return failure("Invalid URL scheme, must be http or https");
            }
        } catch (URISyntaxException e) {
            return failure("Invalid URL format: " + e.getMessage());
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
