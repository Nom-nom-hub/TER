"""Tests for environment access"""

import os
import pytest
from ter.core.schema import Schema
from ter.core.types import Types
from ter.runtime.resolver import Resolver
from ter.runtime.environment import Environment


@pytest.fixture
def schema():
    s = Schema()
    s.define("PORT", Types.int().default(3000))
    s.define("HOST", Types.string().default("localhost"))
    s.define("API_KEY", Types.secret().mark_required())
    s.define("DEBUG", Types.boolean().default(False))
    return s


@pytest.fixture
def resolver(schema):
    r = Resolver(schema)
    r.add_file_env({"API_KEY": "test-key"})
    return r


@pytest.fixture
def env(schema, resolver):
    return Environment(schema, resolver)


class TestEnvironmentBasic:
    def test_get_string(self, env):
        env.resolver.add_file_env({"HOST": "example.com"})
        assert env.get_string("HOST") == "example.com"
    
    def test_get_int(self, env):
        env.resolver.add_file_env({"PORT": "8000"})
        assert env.get_int("PORT") == 8000
    
    def test_get_bool(self, env):
        env.resolver.add_file_env({"DEBUG": "true"})
        assert env.get_bool("DEBUG") is True
    
    def test_get_float(self, env):
        env.resolver.add_file_env({"RATE": "0.5"})
        assert env.get_float("RATE") == 0.5


class TestEnvironmentDefaults:
    def test_default_int(self, env):
        assert env.get_int("PORT") == 3000
    
    def test_default_string(self, env):
        assert env.get_string("HOST") == "localhost"
    
    def test_default_bool(self, env):
        assert env.get_bool("DEBUG") is False


class TestEnvironmentOptional:
    def test_optional_missing(self, env):
        result = env.get_optional("MISSING")
        assert result is None


class TestEnvironmentJSON:
    def test_get_json_dict(self, env):
        env.resolver.add_file_env({"CONFIG": '{"key":"value"}'})
        assert env.get_json("CONFIG") == {"key": "value"}
    
    def test_get_json_array(self, env):
        env.resolver.add_file_env({"ITEMS": '[1,2,3]'})
        assert env.get_json("ITEMS") == [1, 2, 3]


class TestEnvironmentValidation:
    def test_validate_success(self, env):
        result = env.validate()
        assert "PORT" in result
        assert "API_KEY" in result
    
    def test_validate_missing_required(self, schema):
        r = Resolver(schema)
        env = Environment(schema, r)
        
        with pytest.raises(ValueError):
            env.validate()


class TestEnvironmentMetadata:
    def test_get_metadata(self, env):
        env.resolver.add_file_env({"API_KEY": "test-key"})
        metadata = env.get_metadata("API_KEY")
        assert metadata is not None
        assert metadata["source"] == "file"


class TestEnvironmentConversion:
    def test_to_dict(self, env):
        d = env.to_dict()
        assert "PORT" in d
        assert "API_KEY" in d
    
    def test_get_all_values(self, env):
        values = env.get_all_values()
        assert "PORT" in values
