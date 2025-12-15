"""Tests for DotEnv adapter"""

import pytest
from ter.adapters.dotenv import (
    parse_dotenv, generate_dotenv, merge_dotenv, diff_dotenv, validate_dotenv
)


class TestParseDotenv:
    def test_basic_parsing(self):
        content = "KEY=value\nPORT=3000"
        result = parse_dotenv(content)
        assert result.valid
        assert result.values["KEY"] == "value"
        assert result.values["PORT"] == "3000"
    
    def test_skip_comments(self):
        content = "# Comment\nKEY=value"
        result = parse_dotenv(content)
        assert result.valid
        assert len(result.values) == 1
    
    def test_skip_empty_lines(self):
        content = "KEY=value\n\nPORT=3000"
        result = parse_dotenv(content)
        assert result.valid
        assert len(result.values) == 2
    
    def test_double_quoted_values(self):
        content = 'KEY="value with spaces"'
        result = parse_dotenv(content)
        assert result.valid
        assert result.values["KEY"] == "value with spaces"
    
    def test_single_quoted_values(self):
        content = "KEY='value'"
        result = parse_dotenv(content)
        assert result.valid
        assert result.values["KEY"] == "value"
    
    def test_escape_sequences(self):
        content = r'KEY="line1\nline2"'
        result = parse_dotenv(content)
        assert result.valid
        assert result.values["KEY"] == "line1\nline2"
    
    def test_invalid_key(self):
        content = "123KEY=value"
        result = parse_dotenv(content)
        assert not result.valid
        assert len(result.errors) > 0
    
    def test_missing_separator(self):
        content = "KEYVALUE"
        result = parse_dotenv(content)
        assert not result.valid


class TestGenerateDotenv:
    def test_basic_generation(self):
        values = {"KEY": "value", "PORT": "3000"}
        result = generate_dotenv(values)
        assert "KEY=value" in result
        assert "PORT=3000" in result
    
    def test_quote_with_spaces(self):
        values = {"KEY": "value with spaces"}
        result = generate_dotenv(values)
        assert 'KEY="value with spaces"' in result
    
    def test_with_header(self):
        values = {"KEY": "value"}
        result = generate_dotenv(values, header="Generated")
        assert "# Generated" in result
    
    def test_escape_special_chars(self):
        values = {"KEY": "line1\nline2"}
        result = generate_dotenv(values)
        assert 'KEY="line1\\nline2"' in result


class TestMergeDotenv:
    def test_merge_two_dicts(self):
        d1 = {"A": "1", "B": "2"}
        d2 = {"C": "3"}
        result = merge_dotenv(d1, d2)
        assert result == {"A": "1", "B": "2", "C": "3"}
    
    def test_merge_override(self):
        d1 = {"A": "1"}
        d2 = {"A": "2"}
        result = merge_dotenv(d1, d2)
        assert result["A"] == "2"
    
    def test_merge_multiple(self):
        d1 = {"A": "1"}
        d2 = {"B": "2"}
        d3 = {"C": "3"}
        result = merge_dotenv(d1, d2, d3)
        assert len(result) == 3


class TestDiffDotenv:
    def test_added(self):
        before = {"A": "1"}
        after = {"A": "1", "B": "2"}
        diff = diff_dotenv(before, after)
        assert "B" in diff["added"]
    
    def test_removed(self):
        before = {"A": "1", "B": "2"}
        after = {"A": "1"}
        diff = diff_dotenv(before, after)
        assert "B" in diff["removed"]
    
    def test_modified(self):
        before = {"A": "1"}
        after = {"A": "2"}
        diff = diff_dotenv(before, after)
        assert "A" in diff["modified"]
        assert diff["modified"]["A"]["before"] == "1"
        assert diff["modified"]["A"]["after"] == "2"
    
    def test_no_changes(self):
        before = {"A": "1"}
        after = {"A": "1"}
        diff = diff_dotenv(before, after)
        assert len(diff["added"]) == 0
        assert len(diff["removed"]) == 0
        assert len(diff["modified"]) == 0


class TestValidateDotenv:
    def test_valid_content(self):
        content = "KEY=value"
        assert validate_dotenv(content)
    
    def test_invalid_content(self):
        content = "123KEY=value"
        assert not validate_dotenv(content)
