"""Type-safe environment access"""

from typing import Any, Optional, Dict
import json
from ter.core.schema import Schema
from ter.runtime.resolver import Resolver


class Environment:
    """Safe environment access with type validation"""
    
    def __init__(self, schema: Schema, resolver: Resolver):
        self.schema = schema
        self.resolver = resolver
        self._cache: Dict[str, Any] = {}
    
    def get(self, name: str, default: Any = None) -> Any:
        """Get raw value"""
        resolved = self.resolver.resolve(name)
        if resolved:
            return resolved.value
        return default
    
    def get_string(self, name: str) -> str:
        """Get as string"""
        value = self.get(name)
        if value is None:
            raise ValueError(f"{name} is required")
        return str(value)
    
    def get_int(self, name: str) -> int:
        """Get as integer"""
        value = self.get(name)
        if value is None:
            raise ValueError(f"{name} is required")
        return int(value)
    
    def get_float(self, name: str) -> float:
        """Get as float"""
        value = self.get(name)
        if value is None:
            raise ValueError(f"{name} is required")
        return float(value)
    
    def get_bool(self, name: str) -> bool:
        """Get as boolean"""
        value = self.get(name)
        if value is None:
            raise ValueError(f"{name} is required")
        
        if isinstance(value, bool):
            return value
        
        if isinstance(value, str):
            return value.lower() in ("true", "1", "yes", "on")
        
        return bool(value)
    
    def get_json(self, name: str) -> Any:
        """Get as JSON"""
        value = self.get(name)
        if value is None:
            raise ValueError(f"{name} is required")
        
        if isinstance(value, (dict, list)):
            return value
        
        return json.loads(str(value))
    
    def get_optional(self, name: str) -> Optional[Any]:
        """Get optional value"""
        return self.get(name)
    
    def validate(self) -> Dict[str, Any]:
        """Validate all variables"""
        values = {}
        for name in self.schema.get_variables():
            resolved = self.resolver.resolve(name)
            if resolved:
                values[name] = resolved.value
        
        return self.schema.validate(values)
    
    def get_all_values(self) -> Dict[str, Any]:
        """Get all resolved values"""
        all_values = {}
        for name, var_def in self.schema.get_variables().items():
            value = self.get(name)
            if value is not None:
                all_values[name] = value
        
        return all_values
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return self.get_all_values()
    
    def get_metadata(self, name: str) -> Optional[Dict[str, Any]]:
        """Get metadata about a value"""
        resolved = self.resolver.resolve(name)
        if resolved:
            return {
                "source": resolved.source,
                "resolved_at": resolved.resolved_at.isoformat()
            }
        return None
