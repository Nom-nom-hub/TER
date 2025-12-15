"""Schema definition and validation"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
import json
from ter.core.types import BaseType, ValidationResult


@dataclass
class VariableDefinition:
    """Definition of an environment variable"""
    name: str
    type: BaseType
    default: Optional[Any] = None
    required: bool = False
    description: Optional[str] = None


class Schema:
    """Environment contract schema"""
    
    def __init__(self):
        self.variables: Dict[str, VariableDefinition] = {}
    
    def define(self, name: str, type_: BaseType, 
               description: Optional[str] = None) -> "Schema":
        """Define a variable"""
        var_def = VariableDefinition(
            name=name,
            type=type_,
            default=type_.get_default(),
            required=type_.is_required(),
            description=description
        )
        self.variables[name] = var_def
        return self
    
    def get_variable(self, name: str) -> Optional[VariableDefinition]:
        """Get variable definition"""
        return self.variables.get(name)
    
    def get_variables(self) -> Dict[str, VariableDefinition]:
        """Get all variables"""
        return self.variables.copy()
    
    def has_variable(self, name: str) -> bool:
        """Check if variable exists"""
        return name in self.variables
    
    def validate(self, values: Dict[str, Any]) -> Dict[str, Any]:
        """Validate values against schema"""
        errors: Dict[str, str] = {}
        validated: Dict[str, Any] = {}
        
        for name, var_def in self.variables.items():
            if name in values:
                result = var_def.type.validate(values[name])
                if result.valid:
                    validated[name] = result.value
                else:
                    errors[name] = result.error
            elif var_def.default is not None:
                validated[name] = var_def.default
            elif var_def.required:
                errors[name] = "Required"
        
        if errors:
            raise ValueError(f"Validation errors: {errors}")
        
        return validated
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert schema to dictionary"""
        variables = {}
        for name, var_def in self.variables.items():
            variables[name] = {
                "type": var_def.type.to_dict(),
                "default": var_def.default,
                "required": var_def.required,
                "description": var_def.description
            }
        
        return {
            "version": "1.0",
            "variables": variables
        }
    
    def to_json(self, indent: int = 2) -> str:
        """Convert schema to JSON"""
        return json.dumps(self.to_dict(), indent=indent)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Schema":
        """Create schema from dictionary"""
        from ter.core.types import (
            StringType, NumberType, IntType, FloatType, BooleanType,
            EnumType, URLType, JSONType, SecretType
        )
        
        schema = cls()
        
        for name, var_config in data.get("variables", {}).items():
            type_config = var_config.get("type", {})
            type_name = type_config.get("type")
            
            # Create appropriate type
            if type_name == "string":
                type_obj = StringType()
            elif type_name == "number":
                type_obj = NumberType()
            elif type_name == "int":
                type_obj = IntType()
            elif type_name == "float":
                type_obj = FloatType()
            elif type_name == "boolean":
                type_obj = BooleanType()
            elif type_name == "enum":
                type_obj = EnumType(type_config.get("values", []))
            elif type_name == "url":
                type_obj = URLType()
            elif type_name == "json":
                type_obj = JSONType()
            elif type_name == "secret":
                type_obj = SecretType()
            else:
                continue
            
            # Apply constraints
            if var_config.get("default"):
                type_obj.default(var_config["default"])
            if var_config.get("required"):
                type_obj.mark_required()
            
            schema.define(name, type_obj, var_config.get("description"))
        
        return schema
