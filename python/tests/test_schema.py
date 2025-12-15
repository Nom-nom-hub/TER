"""Tests for schema system"""

import pytest
from ter.core.schema import Schema
from ter.core.types import Types


class TestSchemaDefinition:
    def test_define_variable(self):
        schema = Schema()
        schema.define("PORT", Types.int().default(3000))
        assert schema.has_variable("PORT")
    
    def test_get_variable(self):
        schema = Schema()
        schema.define("PORT", Types.int())
        var = schema.get_variable("PORT")
        assert var is not None
        assert var.name == "PORT"
    
    def test_get_variables(self):
        schema = Schema()
        schema.define("PORT", Types.int())
        schema.define("HOST", Types.string())
        vars = schema.get_variables()
        assert len(vars) == 2
    
    def test_chaining(self):
        schema = Schema()
        result = schema.define("A", Types.string()).define("B", Types.int())
        assert result == schema
        assert len(schema.get_variables()) == 2


class TestSchemaValidation:
    def test_valid_values(self):
        schema = Schema()
        schema.define("PORT", Types.int())
        schema.define("HOST", Types.string().default("localhost"))
        
        result = schema.validate({"PORT": "3000"})
        assert result["PORT"] == 3000
        assert result["HOST"] == "localhost"
    
    def test_missing_required(self):
        schema = Schema()
        schema.define("PORT", Types.int().mark_required())
        
        with pytest.raises(ValueError):
            schema.validate({})
    
    def test_type_validation(self):
        schema = Schema()
        schema.define("PORT", Types.int())
        
        with pytest.raises(ValueError):
            schema.validate({"PORT": "not a number"})


class TestSchemaSerialization:
    def test_to_dict(self):
        schema = Schema()
        schema.define("PORT", Types.int().default(3000))
        
        data = schema.to_dict()
        assert "variables" in data
        assert "PORT" in data["variables"]
    
    def test_to_json(self):
        schema = Schema()
        schema.define("PORT", Types.int())
        
        json_str = schema.to_json()
        assert "PORT" in json_str
        assert "int" in json_str
    
    def test_from_dict(self):
        schema = Schema()
        schema.define("PORT", Types.int().default(3000))
        
        data = schema.to_dict()
        schema2 = Schema.from_dict(data)
        
        assert schema2.has_variable("PORT")
        var = schema2.get_variable("PORT")
        assert var.default == 3000


class TestSchemaComplexTypes:
    def test_enum_type(self):
        schema = Schema()
        schema.define("ENV", Types.enum(['dev', 'prod']))
        
        result = schema.validate({"ENV": "dev"})
        assert result["ENV"] == "dev"
    
    def test_url_type(self):
        schema = Schema()
        schema.define("API_URL", Types.url())
        
        result = schema.validate({"API_URL": "https://api.example.com"})
        assert result["API_URL"] == "https://api.example.com"
    
    def test_json_type(self):
        schema = Schema()
        schema.define("CONFIG", Types.json())
        
        result = schema.validate({"CONFIG": '{"key":"value"}'})
        assert result["CONFIG"] == {"key": "value"}
    
    def test_secret_type(self):
        schema = Schema()
        schema.define("API_KEY", Types.secret())
        
        result = schema.validate({"API_KEY": "secret123"})
        assert result["API_KEY"] == "secret123"
