package adapters

import (
	"fmt"
	"regexp"
	"strings"
)

// ParseError represents a parse error
type ParseError struct {
	Line    int
	Message string
}

// ParseResult represents the result of parsing
type ParseResult struct {
	Valid  bool
	Values map[string]string
	Errors []ParseError
}

// ParseDotenv parses .env content
func ParseDotenv(content string) ParseResult {
	lines := strings.Split(content, "\n")
	values := make(map[string]string)
	var errors []ParseError

	keyPattern := regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

	for lineNum, line := range lines {
		line = strings.TrimSpace(line)

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Find = separator
		idx := strings.Index(line, "=")
		if idx == -1 {
			errors = append(errors, ParseError{
				Line:    lineNum + 1,
				Message: "Missing = separator",
			})
			continue
		}

		key := strings.TrimSpace(line[:idx])
		rawValue := strings.TrimSpace(line[idx+1:])

		// Validate key
		if key == "" || !keyPattern.MatchString(key) {
			errors = append(errors, ParseError{
				Line:    lineNum + 1,
				Message: fmt.Sprintf("Invalid key name: %s", key),
			})
			continue
		}

		// Parse value
		var value string
		if strings.HasPrefix(rawValue, `"`) && strings.HasSuffix(rawValue, `"`) {
			// Double quoted - process escape sequences
			value = rawValue[1 : len(rawValue)-1]
			value = strings.ReplaceAll(value, `\n`, "\n")
			value = strings.ReplaceAll(value, `\t`, "\t")
			value = strings.ReplaceAll(value, `\r`, "\r")
			value = strings.ReplaceAll(value, `\"`, `"`)
			value = strings.ReplaceAll(value, `\\`, `\`)
		} else if strings.HasPrefix(rawValue, `'`) && strings.HasSuffix(rawValue, `'`) {
			// Single quoted - no escape processing
			value = rawValue[1 : len(rawValue)-1]
		} else {
			// Unquoted
			value = rawValue
		}

		values[key] = value
	}

	return ParseResult{
		Valid:  len(errors) == 0,
		Values: values,
		Errors: errors,
	}
}

// GenerateDotenv generates .env content from values
func GenerateDotenv(values map[string]string, header string) string {
	var lines []string

	if header != "" {
		lines = append(lines, fmt.Sprintf("# %s", header), "")
	}

	for key, value := range values {
		if needsQuoting(value) {
			escaped := strings.ReplaceAll(value, `\`, `\\`)
			escaped = strings.ReplaceAll(escaped, "\n", `\n`)
			escaped = strings.ReplaceAll(escaped, "\t", `\t`)
			escaped = strings.ReplaceAll(escaped, "\r", `\r`)
			escaped = strings.ReplaceAll(escaped, `"`, `\"`)
			lines = append(lines, fmt.Sprintf(`%s="%s"`, key, escaped))
		} else {
			lines = append(lines, fmt.Sprintf("%s=%s", key, value))
		}
	}

	return strings.Join(lines, "\n")
}

func needsQuoting(value string) bool {
	if value == "" {
		return true
	}
	if strings.Contains(value, " ") {
		return true
	}
	if strings.ContainsAny(value, `="'#\n\t`) {
		return true
	}
	return false
}

// MergeDotenv merges multiple environment dictionaries
func MergeDotenv(dicts ...map[string]string) map[string]string {
	result := make(map[string]string)
	for _, d := range dicts {
		for k, v := range d {
			result[k] = v
		}
	}
	return result
}

// DiffResult represents differences between environments
type DiffResult struct {
	Added    map[string]string
	Removed  map[string]string
	Modified map[string]map[string]string
}

// DiffDotenv diffs two environment dictionaries
func DiffDotenv(before, after map[string]string) DiffResult {
	result := DiffResult{
		Added:    make(map[string]string),
		Removed:  make(map[string]string),
		Modified: make(map[string]map[string]string),
	}

	// Added and modified
	for key, afterVal := range after {
		if beforeVal, ok := before[key]; !ok {
			result.Added[key] = afterVal
		} else if beforeVal != afterVal {
			result.Modified[key] = map[string]string{
				"before": beforeVal,
				"after":  afterVal,
			}
		}
	}

	// Removed
	for key, val := range before {
		if _, ok := after[key]; !ok {
			result.Removed[key] = val
		}
	}

	return result
}

// ValidateDotenv validates .env content
func ValidateDotenv(content string) bool {
	result := ParseDotenv(content)
	return result.Valid
}
