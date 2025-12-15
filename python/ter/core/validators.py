"""Validation hooks for custom type validators."""

import re
import asyncio
from typing import Callable, List, Dict, Set, Any, Optional, Union
from email.utils import parseaddr


AsyncValidator = Callable[[Any], asyncio.coroutine]
SyncValidator = Callable[[Any], None]


class TypeValidator:
    """Validator chain for types."""
    
    def __init__(self):
        self.validators: List[Union[AsyncValidator, SyncValidator]] = []
    
    def add_validator(self, validator: Union[AsyncValidator, SyncValidator]) -> 'TypeValidator':
        """Add a validator to the chain."""
        self.validators.append(validator)
        return self
    
    async def validate(self, value: Any) -> None:
        """Validate value with all validators (async)."""
        for validator in self.validators:
            if asyncio.iscoroutinefunction(validator):
                await validator(value)
            else:
                validator(value)
    
    def validate_sync(self, value: Any) -> None:
        """Validate value with sync validators only."""
        for validator in self.validators:
            if asyncio.iscoroutinefunction(validator):
                raise RuntimeError("Cannot run async validator in sync context")
            validator(value)


class Validators:
    """Common validator implementations."""
    
    @staticmethod
    def email() -> SyncValidator:
        """Email format validator."""
        def validator(value: Any) -> None:
            email = str(value)
            pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
            if not re.match(pattern, email):
                raise ValueError("Invalid email format")
        return validator
    
    @staticmethod
    def url_format() -> SyncValidator:
        """URL format validator."""
        def validator(value: Any) -> None:
            url = str(value)
            pattern = r'^https?://[^\s/$.?#].[^\s]*$'
            if not re.match(pattern, url):
                raise ValueError("Invalid URL format")
        return validator
    
    @staticmethod
    def min_length(min_len: int) -> SyncValidator:
        """Minimum length validator."""
        def validator(value: Any) -> None:
            s = str(value)
            if len(s) < min_len:
                raise ValueError(f"Minimum length is {min_len}")
        return validator
    
    @staticmethod
    def max_length(max_len: int) -> SyncValidator:
        """Maximum length validator."""
        def validator(value: Any) -> None:
            s = str(value)
            if len(s) > max_len:
                raise ValueError(f"Maximum length is {max_len}")
        return validator
    
    @staticmethod
    def pattern(regex: Union[str, re.Pattern]) -> SyncValidator:
        """Pattern validator."""
        pattern = regex if isinstance(regex, re.Pattern) else re.compile(regex)
        def validator(value: Any) -> None:
            s = str(value)
            if not pattern.match(s):
                raise ValueError(f"Value does not match pattern")
        return validator
    
    @staticmethod
    def range(min_val: float, max_val: float) -> SyncValidator:
        """Range validator for numbers."""
        def validator(value: Any) -> None:
            num = float(value)
            if num < min_val or num > max_val:
                raise ValueError(f"Value must be between {min_val} and {max_val}")
        return validator
    
    @staticmethod
    def custom(predicate: Callable[[Any], bool], message: str) -> SyncValidator:
        """Custom validator with predicate."""
        def validator(value: Any) -> None:
            if not predicate(value):
                raise ValueError(message)
        return validator
    
    @staticmethod
    def async_database(
        check_fn: Callable[[Any], asyncio.coroutine],
        message: str
    ) -> AsyncValidator:
        """Database check validator (async)."""
        async def validator(value: Any) -> None:
            result = await check_fn(value)
            if not result:
                raise ValueError(message)
        return validator
    
    @staticmethod
    def async_check(
        check_fn: Callable[[Any], asyncio.coroutine],
        message: str
    ) -> AsyncValidator:
        """Custom async validator."""
        async def validator(value: Any) -> None:
            result = await check_fn(value)
            if not result:
                raise ValueError(message)
        return validator
    
    @staticmethod
    def one_of(allowed: List[Any]) -> SyncValidator:
        """One-of validator."""
        def validator(value: Any) -> None:
            if value not in allowed:
                raise ValueError(f"Value must be one of: {', '.join(map(str, allowed))}")
        return validator
    
    @staticmethod
    def unique(existing_values: Set[Any]) -> SyncValidator:
        """Uniqueness validator."""
        def validator(value: Any) -> None:
            if value in existing_values:
                raise ValueError("Value must be unique")
        return validator


class SchemaValidators:
    """Schema-level validators."""
    
    def __init__(self):
        self.validators: Dict[str, List[Union[AsyncValidator, SyncValidator]]] = {}
    
    def add_field_validator(
        self,
        field_name: str,
        validator: Union[AsyncValidator, SyncValidator]
    ) -> 'SchemaValidators':
        """Add field-level validator."""
        if field_name not in self.validators:
            self.validators[field_name] = []
        self.validators[field_name].append(validator)
        return self
    
    def add_cross_field_validator(
        self,
        validator: Union[Callable[[Dict[str, Any]], None], Callable[[Dict[str, Any]], asyncio.coroutine]]
    ) -> 'SchemaValidators':
        """Add cross-field validator."""
        if '__cross__' not in self.validators:
            self.validators['__cross__'] = []
        self.validators['__cross__'].append(validator)
        return self
    
    async def validate_all(self, values: Dict[str, Any]) -> Dict[str, List[str]]:
        """Validate all fields and return errors."""
        errors: Dict[str, List[str]] = {}
        
        # Field validators
        for field_name, validators in self.validators.items():
            if field_name == '__cross__':
                continue
            
            value = values.get(field_name)
            field_errors: List[str] = []
            
            for validator in validators:
                try:
                    if asyncio.iscoroutinefunction(validator):
                        await validator(value)
                    else:
                        validator(value)
                except (ValueError, Exception) as e:
                    field_errors.append(str(e))
            
            if field_errors:
                errors[field_name] = field_errors
        
        # Cross-field validators
        if '__cross__' in self.validators:
            cross_errors: List[str] = []
            for validator in self.validators['__cross__']:
                try:
                    if asyncio.iscoroutinefunction(validator):
                        await validator(values)
                    else:
                        validator(values)
                except (ValueError, Exception) as e:
                    cross_errors.append(str(e))
            
            if cross_errors:
                errors['__cross__'] = cross_errors
        
        return errors
