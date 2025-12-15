"""
DotEnv Multiline Value Support (Python Implementation)

Handles multiline values in .env files:
- Line continuation with backslash
- Heredoc syntax (<<EOF)
- Proper escape sequence handling
"""

import re
from typing import Dict, Optional, Tuple


class MultilineOptions:
    """Configuration for multiline parsing"""

    def __init__(
        self,
        allow_line_continuation: bool = True,
        allow_heredoc: bool = True,
        max_size: int = 1048576,  # 1MB
        preserve_indentation: bool = False,
    ):
        self.allow_line_continuation = allow_line_continuation
        self.allow_heredoc = allow_heredoc
        self.max_size = max_size
        self.preserve_indentation = preserve_indentation


def parse_dotenv_with_multiline(
    content: str, options: Optional[MultilineOptions] = None
) -> Dict[str, str]:
    """
    Parse .env file with multiline value support

    Args:
        content: .env file content
        options: Parsing options

    Returns:
        Dictionary of key-value pairs
    """
    if options is None:
        options = MultilineOptions()

    result: Dict[str, str] = {}
    lines = content.split('\n')
    i = 0

    while i < len(lines):
        line = lines[i]

        # Skip comments and empty lines
        if not line.strip() or line.strip().startswith('#'):
            i += 1
            continue

        # Try to parse key=value
        match = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$', line)
        if not match:
            i += 1
            continue

        key = match.group(1)
        value = match.group(2)

        # Check for heredoc syntax
        if options.allow_heredoc:
            heredoc_match = re.match(r'^<<(\w+)\s*$', value.strip())
            if heredoc_match:
                delimiter = heredoc_match.group(1)
                i += 1
                heredoc_lines = []

                while i < len(lines):
                    heredoc_line = lines[i]
                    if heredoc_line.strip() == delimiter:
                        break
                    heredoc_lines.append(heredoc_line)
                    i += 1

                value = '\n'.join(heredoc_lines)

                if not options.preserve_indentation:
                    value = _remove_common_indentation(value)

                result[key] = value
                i += 1
                continue

        # Handle line continuation
        if options.allow_line_continuation and value.endswith('\\'):
            continued_lines = [value[:-1]]  # Remove trailing backslash
            i += 1

            while i < len(lines) and options.allow_line_continuation:
                next_line = lines[i]

                # Stop at comments or key=value lines
                if not next_line.strip() or next_line.strip().startswith('#'):
                    break

                if re.match(r'^[A-Za-z_][A-Za-z0-9_]*\s*=', next_line):
                    break

                # Handle quoted continuation
                if re.match(r'^[\'"][^\'"]*[\'"]$', next_line):
                    continued_lines.append(next_line)
                    i += 1
                    if not next_line.endswith('\\'):
                        break
                    continued_lines[-1] = continued_lines[-1][:-1]
                elif next_line.endswith('\\'):
                    continued_lines.append(next_line[:-1])
                    i += 1
                else:
                    continued_lines.append(next_line)
                    i += 1
                    break

            value = '\n'.join(continued_lines)

        # Handle quoted values
        if (value.startswith('"') and '"' in value[1:]) or \
           (value.startswith("'") and "'" in value[1:]):
            quote = value[0]
            close_index = value.find(quote, 1)

            # Handle escaped quotes
            while close_index > 0 and value[close_index - 1] == '\\':
                close_index = value.find(quote, close_index + 1)

            if close_index > 0:
                value = value[1:close_index]
                # Unescape common sequences
                value = _unescape_string(value, quote == '"')

        # Check size limit
        if options.max_size > 0 and len(value) > options.max_size:
            raise ValueError(
                f"Value for key '{key}' exceeds maximum size of {options.max_size} bytes"
            )

        result[key] = value
        i += 1

    return result


def generate_dotenv_with_multiline(
    values: Dict[str, str],
    use_heredoc: bool = True,
    max_line_length: int = 80,
) -> str:
    """
    Generate .env file with multiline value support

    Args:
        values: Dictionary of key-value pairs
        use_heredoc: Use heredoc syntax for multiline values
        max_line_length: Wrap values longer than this

    Returns:
        .env file content
    """
    lines = []

    for key, value in values.items():
        if not _is_valid_key(key):
            raise ValueError(f'Invalid key: {key}')

        # Determine how to format the value
        if '\n' in value:
            # Multiline value
            if use_heredoc and '<<EOF' not in value and '\n\n' not in value:
                # Use heredoc for cleaner multiline
                lines.append(f'{key}=<<EOF')
                lines.append(value)
                lines.append('EOF')
            else:
                # Use line continuation
                parts = value.split('\n')
                lines.append(f'{key}={_escape_value(parts[0])}')
                for i in range(1, len(parts)):
                    part = _escape_value(parts[i])
                    if i < len(parts) - 1:
                        lines.append(part + ' \\')
                    else:
                        lines.append(part)
        elif len(value) > max_line_length or _needs_quoting(value):
            # Single-line but needs quoting or is long
            lines.append(f'{key}="{_escape_value(value)}"')
        else:
            # Simple value
            lines.append(f'{key}={value}')

    return '\n'.join(lines)


def merge_dotenv_files(*contents: str) -> Dict[str, str]:
    """
    Merge multiple .env files with multiline support

    Args:
        *contents: .env file contents

    Returns:
        Merged dictionary
    """
    result: Dict[str, str] = {}

    for content in contents:
        parsed = parse_dotenv_with_multiline(content)
        result.update(parsed)

    return result


class DotEnvDiff:
    """Result of comparing two .env files"""

    def __init__(self):
        self.added: Dict[str, str] = {}
        self.removed: Dict[str, str] = {}
        self.modified: Dict[str, Tuple[str, str]] = {}
        self.unchanged: Dict[str, str] = {}


def diff_dotenv_files(old_content: str, new_content: str) -> DotEnvDiff:
    """
    Compare two .env files

    Args:
        old_content: Old .env content
        new_content: New .env content

    Returns:
        DotEnvDiff with added, removed, modified, unchanged
    """
    old_parsed = parse_dotenv_with_multiline(old_content)
    new_parsed = parse_dotenv_with_multiline(new_content)

    diff = DotEnvDiff()

    # Find added and modified
    for key, new_value in new_parsed.items():
        if key not in old_parsed:
            diff.added[key] = new_value
        elif old_parsed[key] != new_value:
            diff.modified[key] = (old_parsed[key], new_value)
        else:
            diff.unchanged[key] = new_value

    # Find removed
    for key, old_value in old_parsed.items():
        if key not in new_parsed:
            diff.removed[key] = old_value

    return diff


# Private helpers


def _remove_common_indentation(value: str) -> str:
    """Remove common indentation from multiline string"""
    lines = value.split('\n')
    if len(lines) <= 1:
        return value

    # Find minimum indentation (ignoring empty lines)
    min_indent = float('inf')
    for line in lines:
        if line.strip():
            indent = len(line) - len(line.lstrip())
            min_indent = min(min_indent, indent)

    if min_indent == float('inf') or min_indent == 0:
        return value

    # Remove common indentation
    result_lines = []
    for line in lines:
        if line.strip():
            result_lines.append(line[int(min_indent):])
        else:
            result_lines.append(line)

    return '\n'.join(result_lines)


def _unescape_string(value: str, is_double_quoted: bool) -> str:
    """Unescape string content"""
    if is_double_quoted:
        return (
            value.replace('\\n', '\n')
            .replace('\\r', '\r')
            .replace('\\t', '\t')
            .replace('\\"', '"')
            .replace('\\\\', '\\')
        )
    # Single quotes: only unescape single quote itself
    return value.replace("\\'", "'")


def _escape_value(value: str) -> str:
    """Escape special characters in value"""
    return (
        value.replace('\\', '\\\\')
        .replace('\n', '\\n')
        .replace('\r', '\\r')
        .replace('\t', '\\t')
        .replace('"', '\\"')
    )


def _needs_quoting(value: str) -> bool:
    """Check if value needs quoting"""
    return bool(re.search(r'[=\s#"\'\\]', value))


def _is_valid_key(key: str) -> bool:
    """Check if key is valid"""
    return bool(re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', key))
