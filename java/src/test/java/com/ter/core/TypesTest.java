package com.ter.core;

import org.junit.Test;
import static org.junit.Assert.*;

public class TypesTest {
    @Test
    public void testStringType() {
        StringType type = Types.string();
        BaseType.ValidationResult result = type.validate("hello");
        assertTrue(result.valid);
        assertEquals("hello", result.value);
    }

    @Test
    public void testStringTypeCoercion() {
        StringType type = Types.string();
        BaseType.ValidationResult result = type.validate(123);
        assertTrue(result.valid);
        assertEquals("123", result.value);
    }

    @Test
    public void testStringTypeRequired() {
        StringType type = Types.string().markRequired();
        BaseType.ValidationResult result = type.validate(null);
        assertFalse(result.valid);
        assertTrue(result.error.contains("required"));
    }

    @Test
    public void testStringTypeMinLength() {
        StringType type = Types.string().minLength(5);
        assertFalse(type.validate("hi").valid);
        assertTrue(type.validate("hello").valid);
    }

    @Test
    public void testIntType() {
        IntType type = Types.integer();
        BaseType.ValidationResult result = type.validate(42);
        assertTrue(result.valid);
        assertEquals(42, result.value);
    }

    @Test
    public void testIntTypeCoercion() {
        IntType type = Types.integer();
        BaseType.ValidationResult result = type.validate("42");
        assertTrue(result.valid);
        assertEquals(42, result.value);
    }

    @Test
    public void testIntTypeMin() {
        IntType type = Types.integer().min(10);
        assertFalse(type.validate(5).valid);
        assertTrue(type.validate(15).valid);
    }

    @Test
    public void testNumberType() {
        NumberType type = Types.number();
        BaseType.ValidationResult result = type.validate(3.14);
        assertTrue(result.valid);
        assertEquals(3.14, result.value);
    }

    @Test
    public void testBooleanType() {
        BooleanType type = Types.bool();
        assertTrue(type.validate(true).valid);
        assertTrue(type.validate("true").valid);
        assertTrue(((Boolean) type.validate("false").value) == false);
    }

    @Test
    public void testEnumType() {
        EnumType type = Types.enumOf("dev", "prod", "staging");
        assertTrue(type.validate("dev").valid);
        assertFalse(type.validate("invalid").valid);
    }

    @Test
    public void testURLType() {
        URLType type = Types.url();
        assertTrue(type.validate("https://example.com").valid);
        assertFalse(type.validate("not a url").valid);
    }

    @Test
    public void testSecretType() {
        SecretType type = Types.secret();
        assertTrue(type.validate("secret_value").valid);
        assertTrue(type.isSecret());
    }
}
