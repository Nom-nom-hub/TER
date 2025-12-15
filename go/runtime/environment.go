package runtime

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/ter-sdk/ter-go/schema"
)

// Environment provides type-safe environment access
type Environment struct {
	schema   *schema.Schema
	resolver *Resolver
}

// NewEnvironment creates a new environment
func NewEnvironment(s *schema.Schema, r *Resolver) *Environment {
	return &Environment{
		schema:   s,
		resolver: r,
	}
}

// Get returns a raw value
func (e *Environment) Get(name string, defaultVal interface{}) interface{} {
	resolved := e.resolver.Resolve(name)
	if resolved != nil {
		return resolved.Value
	}
	return defaultVal
}

// GetString returns a string value
func (e *Environment) GetString(name string) (string, error) {
	val := e.Get(name, nil)
	if val == nil {
		return "", fmt.Errorf("%s is required", name)
	}
	return fmt.Sprintf("%v", val), nil
}

// GetInt returns an integer value
func (e *Environment) GetInt(name string) (int, error) {
	val := e.Get(name, nil)
	if val == nil {
		return 0, fmt.Errorf("%s is required", name)
	}

	switch v := val.(type) {
	case int:
		return v, nil
	case int64:
		return int(v), nil
	case float64:
		return int(v), nil
	case string:
		n, err := strconv.Atoi(v)
		if err != nil {
			return 0, fmt.Errorf("cannot convert '%v' to int", val)
		}
		return n, nil
	default:
		return 0, fmt.Errorf("cannot convert '%v' to int", val)
	}
}

// GetFloat returns a float value
func (e *Environment) GetFloat(name string) (float64, error) {
	val := e.Get(name, nil)
	if val == nil {
		return 0, fmt.Errorf("%s is required", name)
	}

	switch v := val.(type) {
	case float64:
		return v, nil
	case int:
		return float64(v), nil
	case string:
		f, err := strconv.ParseFloat(v, 64)
		if err != nil {
			return 0, fmt.Errorf("cannot convert '%v' to float", val)
		}
		return f, nil
	default:
		return 0, fmt.Errorf("cannot convert '%v' to float", val)
	}
}

// GetBool returns a boolean value
func (e *Environment) GetBool(name string) (bool, error) {
	val := e.Get(name, nil)
	if val == nil {
		return false, fmt.Errorf("%s is required", name)
	}

	switch v := val.(type) {
	case bool:
		return v, nil
	case string:
		lower := strings.ToLower(v)
		if lower == "true" || lower == "1" || lower == "yes" || lower == "on" {
			return true, nil
		}
		if lower == "false" || lower == "0" || lower == "no" || lower == "off" {
			return false, nil
		}
		return false, fmt.Errorf("'%v' is not a valid boolean", val)
	default:
		return false, fmt.Errorf("cannot convert '%v' to bool", val)
	}
}

// GetJSON returns a JSON-decoded value
func (e *Environment) GetJSON(name string) (interface{}, error) {
	val := e.Get(name, nil)
	if val == nil {
		return nil, fmt.Errorf("%s is required", name)
	}

	switch v := val.(type) {
	case map[string]interface{}, []interface{}:
		return v, nil
	case string:
		var result interface{}
		if err := json.Unmarshal([]byte(v), &result); err != nil {
			return nil, fmt.Errorf("invalid JSON: %w", err)
		}
		return result, nil
	default:
		return nil, fmt.Errorf("cannot decode '%v' as JSON", val)
	}
}

// Validate validates all variables
func (e *Environment) Validate() (map[string]interface{}, error) {
	values := make(map[string]interface{})
	for name := range e.schema.GetVariables() {
		resolved := e.resolver.Resolve(name)
		if resolved != nil {
			values[name] = resolved.Value
		}
	}
	return e.schema.Validate(values)
}

// ToMap converts to map representation
func (e *Environment) ToMap() map[string]interface{} {
	m := make(map[string]interface{})
	for name := range e.schema.GetVariables() {
		val := e.Get(name, nil)
		if val != nil {
			m[name] = val
		}
	}
	return m
}

// GetMetadata returns metadata about a value
func (e *Environment) GetMetadata(name string) map[string]interface{} {
	resolved := e.resolver.Resolve(name)
	if resolved != nil {
		return map[string]interface{}{
			"source":      resolved.Source,
			"resolved_at": resolved.ResolvedAt,
		}
	}
	return nil
}
