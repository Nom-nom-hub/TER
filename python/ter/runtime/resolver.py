"""Multi-source environment value resolver"""

import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ResolvedValue:
    """Value resolved with metadata"""
    value: Any
    source: str  # "process", "file", "injected", "default"
    resolved_at: datetime


class Resolver:
    """Resolves environment values from multiple sources"""
    
    def __init__(self, schema=None):
        self.schema = schema
        self._file_env: Dict[str, str] = {}
        self._injected: Dict[str, str] = {}
    
    def add_file_env(self, env_dict: Dict[str, str]) -> "Resolver":
        """Add environment values from file"""
        self._file_env.update(env_dict)
        return self
    
    def add_injected(self, env_dict: Dict[str, str]) -> "Resolver":
        """Add injected environment values"""
        self._injected.update(env_dict)
        return self
    
    def resolve(self, name: str) -> Optional[ResolvedValue]:
        """Resolve a value from multiple sources"""
        # Try process.env
        if name in os.environ:
            return ResolvedValue(
                value=os.environ[name],
                source="process",
                resolved_at=datetime.now()
            )
        
        # Try file environment
        if name in self._file_env:
            return ResolvedValue(
                value=self._file_env[name],
                source="file",
                resolved_at=datetime.now()
            )
        
        # Try injected
        if name in self._injected:
            return ResolvedValue(
                value=self._injected[name],
                source="injected",
                resolved_at=datetime.now()
            )
        
        # Try default from schema
        if self.schema:
            var_def = self.schema.get_variable(name)
            if var_def and var_def.default:
                return ResolvedValue(
                    value=var_def.default,
                    source="default",
                    resolved_at=datetime.now()
                )
        
        return None
    
    def resolve_all(self) -> Dict[str, ResolvedValue]:
        """Resolve all known variables"""
        resolved = {}
        
        if self.schema:
            for name in self.schema.get_variables():
                value = self.resolve(name)
                if value:
                    resolved[name] = value
        
        return resolved
