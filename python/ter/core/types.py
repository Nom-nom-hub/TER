"""Core type system with validation and coercion"""

from abc import ABC, abstractmethod
from typing import Any, Optional, Union, Pattern, List, Dict
import re
import json
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    """Result of type validation"""
    valid: bool
    value: Optional[Any] = None
    error: Optional[str] = None


class BaseType(ABC):
    """Base class for all TER types"""
    
    def __init__(self, type_name: str):
        self.type_name = type_name
        self._default: Optional[Any] = None
        self._required = False
        self._constraints: Dict[str, Any] = {}
    
    @abstractmethod
    def validate(self, value: Any) -> ValidationResult:
        """Validate and coerce a value"""
        pass
    
    def default(self, value: Any) -> "BaseType":
        """Set default value"""
        self._default = value
        return self
    
    def mark_required(self) -> "BaseType":
        """Mark as required"""
        self._required = True
        return self
    
    def optional(self) -> "BaseType":
        """Mark as optional"""
        self._required = False
        return self
    
    def is_required(self) -> bool:
        """Check if required"""
        return self._required
    
    def get_default(self) -> Optional[Any]:
        """Get default value"""
        return self._default
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        return {
            "type": self.type_name,
            "required": self._required,
            "default": self._default,
            "constraints": self._constraints
        }


class StringType(BaseType):
    """String type with length and pattern constraints"""
    
    def __init__(self):
        super().__init__("string")
        self._min_length: Optional[int] = None
        self._max_length: Optional[int] = None
        self._pattern: Optional[Pattern] = None
    
    def min(self, length: int) -> "StringType":
        """Set minimum length"""
        self._min_length = length
        self._constraints["minLength"] = length
        return self
    
    def max(self, length: int) -> "StringType":
        """Set maximum length"""
        self._max_length = length
        self._constraints["maxLength"] = length
        return self
    
    def matches(self, pattern: str) -> "StringType":
        """Set regex pattern"""
        self._pattern = re.compile(pattern)
        self._constraints["pattern"] = pattern
        return self
    
    def validate(self, value: Any) -> ValidationResult:
        """Validate string"""
        if value is None:
            return ValidationResult(valid=False, error="Value is required")
        
        if not isinstance(value, str):
            value = str(value)
        
        if self._min_length and len(value) < self._min_length:
            return ValidationResult(
                valid=False,
                error=f"String too short (min {self._min_length})"
            )
        
        if self._max_length and len(value) > self._max_length:
            return ValidationResult(
                valid=False,
                error=f"String too long (max {self._max_length})"
            )
        
        if self._pattern and not self._pattern.match(value):
            return ValidationResult(
                valid=False,
                error=f"String does not match pattern {self._pattern.pattern}"
            )
        
        return ValidationResult(valid=True, value=value)


class NumberType(BaseType):
    """Floating point number type with range constraints"""
    
    def __init__(self):
        super().__init__("number")
        self._minimum: Optional[float] = None
        self._maximum: Optional[float] = None
    
    def minimum(self, value: float) -> "NumberType":
        """Set minimum value"""
        self._minimum = value
        self._constraints["minimum"] = value
        return self
    
    def maximum(self, value: float) -> "NumberType":
        """Set maximum value"""
        self._maximum = value
        self._constraints["maximum"] = value
        return self
    
    def validate(self, value: Any) -> ValidationResult:
        """Validate number"""
        if value is None:
            return ValidationResult(valid=False, error="Value is required")
        
        try:
            num = float(value)
        except (ValueError, TypeError):
            return ValidationResult(valid=False, error=f"'{value}' is not a valid number")
        
        if self._minimum is not None and num < self._minimum:
            return ValidationResult(
                valid=False,
                error=f"Number below minimum ({self._minimum})"
            )
        
        if self._maximum is not None and num > self._maximum:
            return ValidationResult(
                valid=False,
                error=f"Number above maximum ({self._maximum})"
            )
        
        return ValidationResult(valid=True, value=num)


class IntType(BaseType):
    """Integer type with range constraints"""
    
    def __init__(self):
        super().__init__("int")
        self._minimum: Optional[int] = None
        self._maximum: Optional[int] = None
    
    def minimum(self, value: int) -> "IntType":
        """Set minimum value"""
        self._minimum = value
        self._constraints["minimum"] = value
        return self
    
    def maximum(self, value: int) -> "IntType":
        """Set maximum value"""
        self._maximum = value
        self._constraints["maximum"] = value
        return self
    
    def validate(self, value: Any) -> ValidationResult:
        """Validate integer"""
        if value is None:
            return ValidationResult(valid=False, error="Value is required")
        
        try:
            if isinstance(value, str):
                num = int(value)
            else:
                num = int(float(value))
        except (ValueError, TypeError):
            return ValidationResult(valid=False, error=f"'{value}' is not a valid integer")
        
        if self._minimum is not None and num < self._minimum:
            return ValidationResult(
                valid=False,
                error=f"Integer below minimum ({self._minimum})"
            )
        
        if self._maximum is not None and num > self._maximum:
            return ValidationResult(
                valid=False,
                error=f"Integer above maximum ({self._maximum})"
            )
        
        return ValidationResult(valid=True, value=num)


class FloatType(BaseType):
    """Floating point type alias for NumberType"""
    
    def __init__(self):
        super().__init__("float")
        self._minimum: Optional[float] = None
        self._maximum: Optional[float] = None
    
    def minimum(self, value: float) -> "FloatType":
        self._minimum = value
        self._constraints["minimum"] = value
        return self
    
    def maximum(self, value: float) -> "FloatType":
        self._maximum = value
        self._constraints["maximum"] = value
        return self
    
    def validate(self, value: Any) -> ValidationResult:
        """Validate float"""
        if value is None:
            return ValidationResult(valid=False, error="Value is required")
        
        try:
            num = float(value)
        except (ValueError, TypeError):
            return ValidationResult(valid=False, error=f"'{value}' is not a valid float")
        
        if self._minimum is not None and num < self._minimum:
            return ValidationResult(
                valid=False,
                error=f"Float below minimum ({self._minimum})"
            )
        
        if self._maximum is not None and num > self._maximum:
            return ValidationResult(
                valid=False,
                error=f"Float above maximum ({self._maximum})"
            )
        
        return ValidationResult(valid=True, value=num)


class BooleanType(BaseType):
    """Boolean type with string coercion"""
    
    def __init__(self):
        super().__init__("boolean")
    
    def validate(self, value: Any) -> ValidationResult:
        """Validate boolean"""
        if value is None:
            return ValidationResult(valid=False, error="Value is required")
        
        if isinstance(value, bool):
            return ValidationResult(valid=True, value=value)
        
        if isinstance(value, str):
            if value.lower() in ("true", "1", "yes", "on"):
                return ValidationResult(valid=True, value=True)
            elif value.lower() in ("false", "0", "no", "off"):
                return ValidationResult(valid=True, value=False)
        
        return ValidationResult(valid=False, error=f"'{value}' is not a valid boolean")


class EnumType(BaseType):
    """Enumeration type with fixed values"""
    
    def __init__(self, values: List[str]):
        super().__init__("enum")
        self.values = values
        self._constraints["enum"] = values
    
    def validate(self, value: Any) -> ValidationResult:
        """Validate enum"""
        if value is None:
            return ValidationResult(valid=False, error="Value is required")
        
        if str(value) not in self.values:
            return ValidationResult(
                valid=False,
                error=f"'{value}' not in {self.values}"
            )
        
        return ValidationResult(valid=True, value=str(value))
    
    def to_dict(self) -> Dict[str, Any]:
        result = super().to_dict()
        result["values"] = self.values
        return result


class URLType(BaseType):
    """URL type with validation"""
    
    def __init__(self):
        super().__init__("url")
        self._url_pattern = re.compile(
            r'^https?://[^\s/$.?#].[^\s]*$',
            re.IGNORECASE
        )
    
    def validate(self, value: Any) -> ValidationResult:
        """Validate URL"""
        if value is None:
            return ValidationResult(valid=False, error="Value is required")
        
        value = str(value)
        if not self._url_pattern.match(value):
            return ValidationResult(
                valid=False,
                error=f"'{value}' is not a valid URL"
            )
        
        return ValidationResult(valid=True, value=value)


class JSONType(BaseType):
    """JSON type with parsing"""
    
    def __init__(self):
        super().__init__("json")
    
    def validate(self, value: Any) -> ValidationResult:
        """Validate JSON"""
        if value is None:
            return ValidationResult(valid=False, error="Value is required")
        
        if isinstance(value, (dict, list)):
            return ValidationResult(valid=True, value=value)
        
        try:
            parsed = json.loads(str(value))
            return ValidationResult(valid=True, value=parsed)
        except (json.JSONDecodeError, ValueError):
            return ValidationResult(
                valid=False,
                error=f"'{value}' is not valid JSON"
            )


class SecretType(BaseType):
    """Secret type with redaction"""
    
    def __init__(self):
        super().__init__("secret")
        self._is_secret = True
    
    def validate(self, value: Any) -> ValidationResult:
        """Validate secret"""
        if value is None:
            return ValidationResult(valid=False, error="Value is required")
        
        return ValidationResult(valid=True, value=str(value))
    
    def is_secret(self) -> bool:
        """Check if this is a secret type"""
        return True


class Types:
    """Factory for creating type instances"""
    
    @staticmethod
    def string() -> StringType:
        return StringType()
    
    @staticmethod
    def number() -> NumberType:
        return NumberType()
    
    @staticmethod
    def int() -> IntType:
        return IntType()
    
    @staticmethod
    def float() -> FloatType:
        return FloatType()
    
    @staticmethod
    def boolean() -> BooleanType:
        return BooleanType()
    
    @staticmethod
    def enum(values: List[str]) -> EnumType:
        return EnumType(values)
    
    @staticmethod
    def url() -> URLType:
        return URLType()
    
    @staticmethod
    def json() -> JSONType:
        return JSONType()
    
    @staticmethod
    def secret() -> SecretType:
        return SecretType()
