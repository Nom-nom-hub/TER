"""
DotEnv Variable Expansion (Python Implementation)

Supports variable interpolation in .env files:
- ${VAR} - expand VAR
- $VAR - expand VAR (simple form)
- ${VAR:-default} - expand VAR or use default
- ${VAR:=default} - expand VAR or use and set default
- Circular reference detection
"""

import re
import os
from typing import Dict, Optional


class VariableExpander:
    """Expands variables in strings with circular reference detection"""

    def __init__(
        self,
        env: Optional[Dict[str, str]] = None,
        max_depth: int = 10,
        throw_on_undefined: bool = True,
        throw_on_circular: bool = True,
    ):
        """Initialize expander with configuration"""
        self.env = env or os.environ.copy()
        self.max_depth = max_depth
        self.throw_on_undefined = throw_on_undefined
        self.throw_on_circular = throw_on_circular
        self.expanding_stack: set = set()

    def expand(self, value: str, depth: int = 0) -> str:
        """Expand all variables in a value"""
        if depth > self.max_depth:
            raise RuntimeError(
                f'Variable expansion exceeded maximum depth of {self.max_depth}'
            )

        # Pattern matches: ${VAR}, ${VAR:-default}, $VAR, etc.
        pattern = r'\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)'

        def replace_var(match):
            braced = match.group(1)
            simple = match.group(2)
            var_expr = braced or simple
            return self._expand_variable(var_expr, depth + 1)

        result = value
        has_matches = True

        while has_matches:
            has_matches = False
            prev_result = result
            result = re.sub(pattern, replace_var, result)
            has_matches = result != prev_result

        return result

    def reset(self) -> None:
        """Reset the expanding stack"""
        self.expanding_stack.clear()

    def _expand_variable(self, expr: str, depth: int) -> str:
        """Expand a single variable expression"""
        # Check for default value syntax: VAR:-default or VAR:=default
        match = re.match(r'^([^:]+)(?::(-|=)(.*))?$', expr)
        if not match:
            raise ValueError(f'Invalid variable expression: ${{{expr}}}')

        var_name = match.group(1)
        default_op = match.group(2)  # '-' or '='
        default_value = match.group(3) or ''

        # Check for circular reference
        if var_name in self.expanding_stack:
            if self.throw_on_circular:
                raise RuntimeError(f'Circular reference detected: {var_name}')
            return f'${{{expr}}}'

        # Get variable value
        value = self.env.get(var_name)

        if value is None:
            if default_op == '-':
                # ${VAR:-default} - use default if undefined
                value = default_value
            elif default_op == '=':
                # ${VAR:=default} - use and set default if undefined
                value = default_value
                self.env[var_name] = value
            else:
                # No default
                if self.throw_on_undefined:
                    raise ValueError(f'Undefined variable: {var_name}')
                return f'${{{expr}}}'

        # Recursively expand the value
        self.expanding_stack.add(var_name)
        try:
            return self.expand(value, depth)
        finally:
            self.expanding_stack.discard(var_name)


def expand_dotenv(
    content: str,
    env: Optional[Dict[str, str]] = None,
    max_depth: int = 10,
    throw_on_undefined: bool = True,
    throw_on_circular: bool = True,
) -> Dict[str, str]:
    """
    Expand variables in .env file content string

    Args:
        content: .env file content
        env: Environment dict to use (defaults to os.environ)
        max_depth: Maximum recursion depth
        throw_on_undefined: Throw on undefined variables
        throw_on_circular: Throw on circular references

    Returns:
        Dictionary of key-value pairs with expanded variables
    """
    expander = VariableExpander(
        env=env,
        max_depth=max_depth,
        throw_on_undefined=throw_on_undefined,
        throw_on_circular=throw_on_circular,
    )

    lines = content.split('\n')
    result: Dict[str, str] = {}

    for line in lines:
        # Skip comments and empty lines
        if not line.strip() or line.strip().startswith('#'):
            continue

        # Parse key=value
        match = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$', line)
        if not match:
            continue

        key = match.group(1)
        value = match.group(2)

        # Handle quoted values
        if (value.startswith('"') and value.endswith('"')) or \
           (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]

        # Expand variables in value
        try:
            result[key] = expander.expand(value)
        except Exception as e:
            raise RuntimeError(f'Error expanding {key}: {e}')

        # Make expanded value available for subsequent expansions
        if env is None:
            os.environ[key] = result[key]
        else:
            env[key] = result[key]

    return result


def escape_variables(value: str) -> str:
    """Escape special characters in values to prevent expansion"""
    return value.replace('$', '\\$').replace('{', '\\{').replace('}', '\\}')


def unescape_variables(value: str) -> str:
    """Unescape previously escaped variables"""
    return value.replace('\\$', '$').replace('\\{', '{').replace('\\}', '}')
