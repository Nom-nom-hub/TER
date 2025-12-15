package com.ter.core;

/**
 * Type factory for creating type instances.
 */
public class Types {
    public static StringType string() {
        return new StringType();
    }

    public static IntType integer() {
        return new IntType();
    }

    public static IntType integer(int minValue, int maxValue) {
        return new IntType().min(minValue).max(maxValue);
    }

    public static NumberType number() {
        return new NumberType();
    }

    public static NumberType number(double minValue, double maxValue) {
        return new NumberType().min(minValue).max(maxValue);
    }

    public static BooleanType bool() {
        return new BooleanType();
    }

    public static EnumType enumOf(String... values) {
        return new EnumType(values);
    }

    public static URLType url() {
        return new URLType();
    }

    public static JSONType json() {
        return new JSONType();
    }

    public static SecretType secret() {
        return new SecretType();
    }
}
