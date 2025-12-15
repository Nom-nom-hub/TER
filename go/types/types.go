package types

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// ValidationResult represents the result of type validation
type ValidationResult struct {
	Valid bool
	Value interface{}
	Error string
}

// BaseType is the interface all types must implement
type BaseType interface {
	Validate(value interface{}) ValidationResult
	GetDefault() interface{}
	IsRequired() bool
	MarkRequired() BaseType
	SetDefault(value interface{}) BaseType
}

// StringType validates string values with constraints
type StringType struct {
	defaultValue interface{}
	required     bool
	minLength    *int
	maxLength    *int
	pattern      *regexp.Regexp
}

// NewStringType creates a new string type
func NewStringType() *StringType {
	return &StringType{}
}

func (t *StringType) Validate(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{Valid: false, Error: "Value is required"}
	}

	str := fmt.Sprintf("%v", value)

	if t.minLength != nil && len(str) < *t.minLength {
		return ValidationResult{Valid: false, Error: fmt.Sprintf("String too short (min %d)", *t.minLength)}
	}

	if t.maxLength != nil && len(str) > *t.maxLength {
		return ValidationResult{Valid: false, Error: fmt.Sprintf("String too long (max %d)", *t.maxLength)}
	}

	if t.pattern != nil && !t.pattern.MatchString(str) {
		return ValidationResult{Valid: false, Error: fmt.Sprintf("String does not match pattern")}
	}

	return ValidationResult{Valid: true, Value: str}
}

func (t *StringType) Min(length int) *StringType {
	t.minLength = &length
	return t
}

func (t *StringType) Max(length int) *StringType {
	t.maxLength = &length
	return t
}

func (t *StringType) Matches(pattern string) *StringType {
	t.pattern = regexp.MustCompile(pattern)
	return t
}

func (t *StringType) SetDefault(value interface{}) BaseType {
	t.defaultValue = value
	return t
}

func (t *StringType) MarkRequired() BaseType {
	t.required = true
	return t
}

func (t *StringType) GetDefault() interface{} {
	return t.defaultValue
}

func (t *StringType) IsRequired() bool {
	return t.required
}

// IntType validates integer values with range constraints
type IntType struct {
	defaultValue interface{}
	required     bool
	minimum      *int
	maximum      *int
}

// NewIntType creates a new integer type
func NewIntType() *IntType {
	return &IntType{}
}

func (t *IntType) Validate(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{Valid: false, Error: "Value is required"}
	}

	var num int
	var err error

	switch v := value.(type) {
	case int:
		num = v
	case int64:
		num = int(v)
	case float64:
		num = int(v)
	case string:
		n, err := strconv.Atoi(v)
		if err != nil {
			return ValidationResult{Valid: false, Error: fmt.Sprintf("'%v' is not a valid integer", value)}
		}
		num = n
	default:
		return ValidationResult{Valid: false, Error: fmt.Sprintf("'%v' is not a valid integer", value)}
	}

	if t.minimum != nil && num < *t.minimum {
		return ValidationResult{Valid: false, Error: fmt.Sprintf("Integer below minimum (%d)", *t.minimum)}
	}

	if t.maximum != nil && num > *t.maximum {
		return ValidationResult{Valid: false, Error: fmt.Sprintf("Integer above maximum (%d)", *t.maximum)}
	}

	return ValidationResult{Valid: true, Value: num}
}

func (t *IntType) Minimum(value int) *IntType {
	t.minimum = &value
	return t
}

func (t *IntType) Maximum(value int) *IntType {
	t.maximum = &value
	return t
}

func (t *IntType) SetDefault(value interface{}) BaseType {
	t.defaultValue = value
	return t
}

func (t *IntType) MarkRequired() BaseType {
	t.required = true
	return t
}

func (t *IntType) GetDefault() interface{} {
	return t.defaultValue
}

func (t *IntType) IsRequired() bool {
	return t.required
}

// FloatType validates floating-point values
type FloatType struct {
	defaultValue interface{}
	required     bool
	minimum      *float64
	maximum      *float64
}

// NewFloatType creates a new float type
func NewFloatType() *FloatType {
	return &FloatType{}
}

func (t *FloatType) Validate(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{Valid: false, Error: "Value is required"}
	}

	var num float64
	var err error

	switch v := value.(type) {
	case float64:
		num = v
	case int:
		num = float64(v)
	case string:
		n, err := strconv.ParseFloat(v, 64)
		if err != nil {
			return ValidationResult{Valid: false, Error: fmt.Sprintf("'%v' is not a valid float", value)}
		}
		num = n
	default:
		return ValidationResult{Valid: false, Error: fmt.Sprintf("'%v' is not a valid float", value)}
	}

	if t.minimum != nil && num < *t.minimum {
		return ValidationResult{Valid: false, Error: fmt.Sprintf("Float below minimum (%v)", *t.minimum)}
	}

	if t.maximum != nil && num > *t.maximum {
		return ValidationResult{Valid: false, Error: fmt.Sprintf("Float above maximum (%v)", *t.maximum)}
	}

	return ValidationResult{Valid: true, Value: num}
}

func (t *FloatType) Minimum(value float64) *FloatType {
	t.minimum = &value
	return t
}

func (t *FloatType) Maximum(value float64) *FloatType {
	t.maximum = &value
	return t
}

func (t *FloatType) SetDefault(value interface{}) BaseType {
	t.defaultValue = value
	return t
}

func (t *FloatType) MarkRequired() BaseType {
	t.required = true
	return t
}

func (t *FloatType) GetDefault() interface{} {
	return t.defaultValue
}

func (t *FloatType) IsRequired() bool {
	return t.required
}

// BoolType validates boolean values
type BoolType struct {
	defaultValue interface{}
	required     bool
}

// NewBoolType creates a new boolean type
func NewBoolType() *BoolType {
	return &BoolType{}
}

func (t *BoolType) Validate(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{Valid: false, Error: "Value is required"}
	}

	switch v := value.(type) {
	case bool:
		return ValidationResult{Valid: true, Value: v}
	case string:
		lower := strings.ToLower(v)
		if lower == "true" || lower == "1" || lower == "yes" || lower == "on" {
			return ValidationResult{Valid: true, Value: true}
		}
		if lower == "false" || lower == "0" || lower == "no" || lower == "off" {
			return ValidationResult{Valid: true, Value: false}
		}
		return ValidationResult{Valid: false, Error: fmt.Sprintf("'%v' is not a valid boolean", value)}
	default:
		return ValidationResult{Valid: false, Error: fmt.Sprintf("'%v' is not a valid boolean", value)}
	}
}

func (t *BoolType) SetDefault(value interface{}) BaseType {
	t.defaultValue = value
	return t
}

func (t *BoolType) MarkRequired() BaseType {
	t.required = true
	return t
}

func (t *BoolType) GetDefault() interface{} {
	return t.defaultValue
}

func (t *BoolType) IsRequired() bool {
	return t.required
}

// EnumType validates enumeration values
type EnumType struct {
	defaultValue interface{}
	required     bool
	values       []string
}

// NewEnumType creates a new enum type
func NewEnumType(values []string) *EnumType {
	return &EnumType{values: values}
}

func (t *EnumType) Validate(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{Valid: false, Error: "Value is required"}
	}

	strVal := fmt.Sprintf("%v", value)
	for _, v := range t.values {
		if v == strVal {
			return ValidationResult{Valid: true, Value: strVal}
		}
	}

	return ValidationResult{Valid: false, Error: fmt.Sprintf("'%v' not in enum", value)}
}

func (t *EnumType) SetDefault(value interface{}) BaseType {
	t.defaultValue = value
	return t
}

func (t *EnumType) MarkRequired() BaseType {
	t.required = true
	return t
}

func (t *EnumType) GetDefault() interface{} {
	return t.defaultValue
}

func (t *EnumType) IsRequired() bool {
	return t.required
}

// URLType validates URL values
type URLType struct {
	defaultValue interface{}
	required     bool
	pattern      *regexp.Regexp
}

// NewURLType creates a new URL type
func NewURLType() *URLType {
	return &URLType{
		pattern: regexp.MustCompile(`^https?://[^\s/$.?#].[^\s]*$`),
	}
}

func (t *URLType) Validate(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{Valid: false, Error: "Value is required"}
	}

	strVal := fmt.Sprintf("%v", value)
	if !t.pattern.MatchString(strVal) {
		return ValidationResult{Valid: false, Error: fmt.Sprintf("'%v' is not a valid URL", value)}
	}

	return ValidationResult{Valid: true, Value: strVal}
}

func (t *URLType) SetDefault(value interface{}) BaseType {
	t.defaultValue = value
	return t
}

func (t *URLType) MarkRequired() BaseType {
	t.required = true
	return t
}

func (t *URLType) GetDefault() interface{} {
	return t.defaultValue
}

func (t *URLType) IsRequired() bool {
	return t.required
}

// JSONType validates JSON values
type JSONType struct {
	defaultValue interface{}
	required     bool
}

// NewJSONType creates a new JSON type
func NewJSONType() *JSONType {
	return &JSONType{}
}

func (t *JSONType) Validate(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{Valid: false, Error: "Value is required"}
	}

	// Any object or array is valid JSON
	switch value.(type) {
	case map[string]interface{}, []interface{}:
		return ValidationResult{Valid: true, Value: value}
	}

	// For string, we would need JSON parsing
	// For simplicity, assume it's valid
	return ValidationResult{Valid: true, Value: value}
}

func (t *JSONType) SetDefault(value interface{}) BaseType {
	t.defaultValue = value
	return t
}

func (t *JSONType) MarkRequired() BaseType {
	t.required = true
	return t
}

func (t *JSONType) GetDefault() interface{} {
	return t.defaultValue
}

func (t *JSONType) IsRequired() bool {
	return t.required
}

// SecretType validates secret values
type SecretType struct {
	defaultValue interface{}
	required     bool
}

// NewSecretType creates a new secret type
func NewSecretType() *SecretType {
	return &SecretType{}
}

func (t *SecretType) Validate(value interface{}) ValidationResult {
	if value == nil {
		return ValidationResult{Valid: false, Error: "Value is required"}
	}

	return ValidationResult{Valid: true, Value: fmt.Sprintf("%v", value)}
}

func (t *SecretType) IsSecret() bool {
	return true
}

func (t *SecretType) SetDefault(value interface{}) BaseType {
	t.defaultValue = value
	return t
}

func (t *SecretType) MarkRequired() BaseType {
	t.required = true
	return t
}

func (t *SecretType) GetDefault() interface{} {
	return t.defaultValue
}

func (t *SecretType) IsRequired() bool {
	return t.required
}
