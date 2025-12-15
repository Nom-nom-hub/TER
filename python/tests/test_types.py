"""Tests for type system"""

import pytest
from ter.core.types import (
    Types, StringType, IntType, NumberType, BooleanType,
    EnumType, URLType, JSONType, SecretType
)


class TestStringType:
    def test_basic_validation(self):
        t = Types.string()
        result = t.validate("hello")
        assert result.valid
        assert result.value == "hello"
    
    def test_coercion(self):
        t = Types.string()
        result = t.validate(123)
        assert result.valid
        assert result.value == "123"
    
    def test_min_length(self):
        t = Types.string().min(3)
        assert not t.validate("ab").valid
        assert t.validate("abc").valid
    
    def test_max_length(self):
        t = Types.string().max(5)
        assert not t.validate("abcdef").valid
        assert t.validate("abcde").valid
    
    def test_pattern_match(self):
        t = Types.string().matches(r'^[a-z]+$')
        assert t.validate("hello").valid
        assert not t.validate("HELLO").valid


class TestIntType:
    def test_basic_validation(self):
        t = Types.int()
        assert t.validate(42).valid
    
    def test_string_coercion(self):
        t = Types.int()
        result = t.validate("42")
        assert result.valid
        assert result.value == 42
    
    def test_float_coercion(self):
        t = Types.int()
        result = t.validate(42.7)
        assert result.valid
        assert result.value == 42
    
    def test_minimum(self):
        t = Types.int().minimum(10)
        assert not t.validate(5).valid
        assert t.validate(10).valid
    
    def test_maximum(self):
        t = Types.int().maximum(100)
        assert not t.validate(101).valid
        assert t.validate(100).valid


class TestNumberType:
    def test_basic_validation(self):
        t = Types.number()
        assert t.validate(3.14).valid
    
    def test_string_coercion(self):
        t = Types.number()
        result = t.validate("3.14")
        assert result.valid
        assert result.value == 3.14
    
    def test_minimum(self):
        t = Types.number().minimum(0.0)
        assert not t.validate(-1.0).valid
        assert t.validate(0.0).valid
    
    def test_maximum(self):
        t = Types.number().maximum(1.0)
        assert not t.validate(1.1).valid
        assert t.validate(1.0).valid


class TestBooleanType:
    def test_bool_validation(self):
        t = Types.boolean()
        assert t.validate(True).valid
        assert t.validate(False).valid
    
    def test_string_coercion_true(self):
        t = Types.boolean()
        for val in ["true", "True", "TRUE", "1", "yes", "on"]:
            result = t.validate(val)
            assert result.valid
            assert result.value is True
    
    def test_string_coercion_false(self):
        t = Types.boolean()
        for val in ["false", "False", "FALSE", "0", "no", "off"]:
            result = t.validate(val)
            assert result.valid
            assert result.value is False
    
    def test_invalid(self):
        t = Types.boolean()
        assert not t.validate("maybe").valid


class TestEnumType:
    def test_valid_value(self):
        t = Types.enum(['dev', 'staging', 'prod'])
        assert t.validate('dev').valid
    
    def test_invalid_value(self):
        t = Types.enum(['dev', 'staging', 'prod'])
        assert not t.validate('test').valid
    
    def test_coercion(self):
        t = Types.enum(['1', '2', '3'])
        result = t.validate(1)
        assert result.valid
        assert result.value == '1'


class TestURLType:
    def test_valid_urls(self):
        t = Types.url()
        for url in ["https://example.com", "http://localhost:3000"]:
            assert t.validate(url).valid
    
    def test_invalid_urls(self):
        t = Types.url()
        for url in ["not a url", "ftp://example.com", "example.com"]:
            assert not t.validate(url).valid


class TestJSONType:
    def test_object_validation(self):
        t = Types.json()
        result = t.validate({"key": "value"})
        assert result.valid
    
    def test_array_validation(self):
        t = Types.json()
        result = t.validate([1, 2, 3])
        assert result.valid
    
    def test_string_parsing(self):
        t = Types.json()
        result = t.validate('{"key":"value"}')
        assert result.valid
        assert result.value == {"key": "value"}
    
    def test_invalid_json(self):
        t = Types.json()
        assert not t.validate('not json').valid


class TestSecretType:
    def test_accepts_values(self):
        t = Types.secret()
        assert t.validate("my-secret").valid
    
    def test_is_secret(self):
        t = Types.secret()
        assert t.is_secret()


class TestTypeModifiers:
    def test_default(self):
        t = Types.string().default("hello")
        assert t.get_default() == "hello"
    
    def test_mark_required(self):
        t = Types.string().mark_required()
        assert t.is_required()
    
    def test_optional(self):
        t = Types.string().mark_required().optional()
        assert not t.is_required()
    
    def test_chaining(self):
        t = Types.int().minimum(0).maximum(100).mark_required()
        assert t.is_required()
        assert t.validate(50).valid
        assert not t.validate(101).valid
