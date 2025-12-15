import pytest
import asyncio
from ter.core.validators import (
    Validators,
    TypeValidator,
    SchemaValidators,
)


class TestValidators:
    """Test individual validators."""
    
    def test_email_valid(self):
        validator = Validators.email()
        validator('test@example.com')  # Should not raise
    
    def test_email_invalid(self):
        validator = Validators.email()
        with pytest.raises(ValueError):
            validator('invalid')
    
    def test_url_format_valid(self):
        validator = Validators.url_format()
        validator('https://example.com')  # Should not raise
    
    def test_url_format_invalid(self):
        validator = Validators.url_format()
        with pytest.raises(ValueError):
            validator('not a url')
    
    def test_min_length_valid(self):
        validator = Validators.min_length(3)
        validator('hello')  # Should not raise
    
    def test_min_length_invalid(self):
        validator = Validators.min_length(5)
        with pytest.raises(ValueError):
            validator('hi')
    
    def test_max_length_valid(self):
        validator = Validators.max_length(5)
        validator('hi')  # Should not raise
    
    def test_max_length_invalid(self):
        validator = Validators.max_length(3)
        with pytest.raises(ValueError):
            validator('hello')
    
    def test_pattern_valid(self):
        validator = Validators.pattern(r'^\d+$')
        validator('12345')  # Should not raise
    
    def test_pattern_invalid(self):
        validator = Validators.pattern(r'^\d+$')
        with pytest.raises(ValueError):
            validator('abc')
    
    def test_range_valid(self):
        validator = Validators.range(0, 100)
        validator(50)  # Should not raise
    
    def test_range_invalid(self):
        validator = Validators.range(0, 100)
        with pytest.raises(ValueError):
            validator(150)
    
    def test_custom_valid(self):
        validator = Validators.custom(
            lambda v: str(v).startswith('user_'),
            'Must start with user_'
        )
        validator('user_123')  # Should not raise
    
    def test_custom_invalid(self):
        validator = Validators.custom(
            lambda v: str(v).startswith('user_'),
            'Must start with user_'
        )
        with pytest.raises(ValueError):
            validator('admin_123')
    
    def test_one_of_valid(self):
        validator = Validators.one_of(['dev', 'staging', 'prod'])
        validator('dev')  # Should not raise
    
    def test_one_of_invalid(self):
        validator = Validators.one_of(['dev', 'staging', 'prod'])
        with pytest.raises(ValueError):
            validator('test')
    
    def test_unique_valid(self):
        existing = {'user1', 'user2'}
        validator = Validators.unique(existing)
        validator('user3')  # Should not raise
    
    def test_unique_invalid(self):
        existing = {'user1', 'user2'}
        validator = Validators.unique(existing)
        with pytest.raises(ValueError):
            validator('user1')


class TestTypeValidator:
    """Test TypeValidator chain."""
    
    def test_chain_multiple_validators(self):
        validator = TypeValidator()\
            .add_validator(Validators.min_length(3))\
            .add_validator(Validators.max_length(10))\
            .add_validator(Validators.pattern(r'^[a-z]+$'))
        
        validator.validate_sync('hello')  # Should not raise
        
        with pytest.raises(ValueError):
            validator.validate_sync('ab')
        
        with pytest.raises(ValueError):
            validator.validate_sync('verylongvalue')
        
        with pytest.raises(ValueError):
            validator.validate_sync('Hello')
    
    @pytest.mark.asyncio
    async def test_async_validators(self):
        async def async_validator(value):
            if len(str(value)) < 5:
                raise ValueError('Too short')
        
        validator = TypeValidator()\
            .add_validator(async_validator)
        
        await validator.validate('hello')  # Should not raise
        
        with pytest.raises(ValueError):
            await validator.validate('hi')
    
    def test_reject_async_in_sync_context(self):
        async def async_validator(value):
            pass
        
        validator = TypeValidator()\
            .add_validator(async_validator)
        
        with pytest.raises(RuntimeError):
            validator.validate_sync('test')


class TestSchemaValidators:
    """Test SchemaValidators."""
    
    @pytest.mark.asyncio
    async def test_field_level_validators(self):
        validators = SchemaValidators()\
            .add_field_validator('email', Validators.email())\
            .add_field_validator('age', Validators.range(0, 150))
        
        values = {'email': 'test@example.com', 'age': 30}
        errors = await validators.validate_all(values)
        assert len(errors) == 0
    
    @pytest.mark.asyncio
    async def test_field_errors(self):
        validators = SchemaValidators()\
            .add_field_validator('email', Validators.email())\
            .add_field_validator('age', Validators.range(0, 150))
        
        values = {'email': 'invalid', 'age': 200}
        errors = await validators.validate_all(values)
        assert 'email' in errors
        assert 'age' in errors
    
    @pytest.mark.asyncio
    async def test_cross_field_validators(self):
        validators = SchemaValidators()\
            .add_cross_field_validator(
                lambda v: None if v.get('password') == v.get('confirmPassword') 
                else (_ for _ in ()).throw(ValueError('Passwords do not match'))
            )
        
        valid_values = {
            'password': 'secret123',
            'confirmPassword': 'secret123',
        }
        errors = await validators.validate_all(valid_values)
        assert len(errors) == 0
        
        invalid_values = {
            'password': 'secret123',
            'confirmPassword': 'different',
        }
        errors = await validators.validate_all(invalid_values)
        assert '__cross__' in errors
    
    @pytest.mark.asyncio
    async def test_multiple_validators_per_field(self):
        validators = SchemaValidators()\
            .add_field_validator('username', Validators.min_length(3))\
            .add_field_validator('username', Validators.max_length(20))\
            .add_field_validator('username', Validators.pattern(r'^[a-z0-9_]+$'))
        
        valid_values = {'username': 'user_123'}
        errors = await validators.validate_all(valid_values)
        assert len(errors) == 0
        
        invalid_values = {'username': 'ab'}
        errors = await validators.validate_all(invalid_values)
        assert 'username' in errors
    
    @pytest.mark.asyncio
    async def test_async_field_validators(self):
        async def reserved_check(value):
            reserved = ['admin', 'root', 'system']
            if value in reserved:
                raise ValueError('Username is reserved')
        
        validators = SchemaValidators()\
            .add_field_validator('username', reserved_check)
        
        values = {'username': 'user123'}
        errors = await validators.validate_all(values)
        assert len(errors) == 0
        
        invalid_values = {'username': 'admin'}
        errors = await validators.validate_all(invalid_values)
        assert 'username' in errors


class TestAsyncValidators:
    """Test async validators."""
    
    @pytest.mark.asyncio
    async def test_async_database_check(self):
        async def check_email(email):
            taken = {'taken@example.com'}
            return email not in taken
        
        validator = Validators.async_database(
            check_email,
            'Email already registered'
        )
        
        await validator('new@example.com')  # Should not raise
        
        with pytest.raises(ValueError):
            await validator('taken@example.com')
    
    @pytest.mark.asyncio
    async def test_async_custom_check(self):
        async def check_username(username):
            return len(str(username)) > 3
        
        validator = Validators.async_check(
            check_username,
            'Username too short'
        )
        
        await validator('user123')  # Should not raise
        
        with pytest.raises(ValueError):
            await validator('ab')
