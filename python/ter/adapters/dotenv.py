"""DotEnv file parsing and generation"""

from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import re


@dataclass
class ParseError:
    """Parse error with location"""
    line: int
    message: str


@dataclass
class ParseResult:
    """Result of parsing .env content"""
    valid: bool
    values: Dict[str, str]
    errors: List[ParseError]


def parse_dotenv(content: str) -> ParseResult:
    """Parse .env file content"""
    lines = content.split('\n')
    values: Dict[str, str] = {}
    errors: List[ParseError] = []
    
    for line_num, line in enumerate(lines, 1):
        line = line.strip()
        
        # Skip empty lines and comments
        if not line or line.startswith('#'):
            continue
        
        # Find = separator
        if '=' not in line:
            errors.append(ParseError(line_num, "Missing = separator"))
            continue
        
        key, _, raw_value = line.partition('=')
        key = key.strip()
        
        # Validate key
        if not key or not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', key):
            errors.append(ParseError(line_num, f"Invalid key name: {key}"))
            continue
        
        # Parse value
        raw_value = raw_value.strip()
        
        # Handle quoted values
        if raw_value.startswith('"') and raw_value.endswith('"'):
            # Double quoted - process escape sequences
            value = raw_value[1:-1]
            value = value.replace('\\n', '\n')
            value = value.replace('\\t', '\t')
            value = value.replace('\\r', '\r')
            value = value.replace('\\"', '"')
            value = value.replace('\\\\', '\\')
        elif raw_value.startswith("'") and raw_value.endswith("'"):
            # Single quoted - no escape processing
            value = raw_value[1:-1]
        else:
            # Unquoted
            value = raw_value
        
        values[key] = value
    
    return ParseResult(valid=len(errors) == 0, values=values, errors=errors)


def generate_dotenv(values: Dict[str, str], header: Optional[str] = None) -> str:
    """Generate .env content from values"""
    lines: List[str] = []
    
    if header:
        lines.append(f"# {header}")
        lines.append("")
    
    for key, value in values.items():
        # Determine if quoting is needed
        if needs_quoting(value):
            # Escape special characters
            escaped = value.replace('\\', '\\\\')
            escaped = escaped.replace('\n', '\\n')
            escaped = escaped.replace('\t', '\\t')
            escaped = escaped.replace('\r', '\\r')
            escaped = escaped.replace('"', '\\"')
            lines.append(f'{key}="{escaped}"')
        else:
            lines.append(f'{key}={value}')
    
    return '\n'.join(lines)


def needs_quoting(value: str) -> bool:
    """Check if value needs quoting"""
    if not value:
        return True
    if ' ' in value:
        return True
    if any(c in value for c in ['=', '"', "'", '#', '\n', '\t']):
        return True
    return False


def merge_dotenv(*dicts: Dict[str, str]) -> Dict[str, str]:
    """Merge multiple environment dictionaries"""
    result: Dict[str, str] = {}
    for d in dicts:
        result.update(d)
    return result


def diff_dotenv(before: Dict[str, str], after: Dict[str, str]) -> Dict[str, any]:
    """Diff two environment dictionaries"""
    added = {}
    removed = {}
    modified = {}
    
    # Added and modified
    for key, value in after.items():
        if key not in before:
            added[key] = value
        elif before[key] != value:
            modified[key] = {
                "before": before[key],
                "after": value
            }
    
    # Removed
    for key in before:
        if key not in after:
            removed[key] = before[key]
    
    return {
        "added": added,
        "removed": removed,
        "modified": modified
    }


def validate_dotenv(content: str) -> bool:
    """Check if .env content is valid"""
    result = parse_dotenv(content)
    return result.valid
