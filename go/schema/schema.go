package schema

import (
	"encoding/json"
	"fmt"

	"github.com/ter-sdk/ter-go/types"
)

// VariableDefinition represents an environment variable
type VariableDefinition struct {
	Name        string
	Type        types.BaseType
	Default     interface{}
	Required    bool
	Description string
}

// Schema defines environment contract
type Schema struct {
	variables map[string]*VariableDefinition
}

// NewSchema creates a new schema
func NewSchema() *Schema {
	return &Schema{
		variables: make(map[string]*VariableDefinition),
	}
}

// Define adds a variable definition
func (s *Schema) Define(name string, varType types.BaseType) *Schema {
	return s.DefineWithDesc(name, varType, "")
}

// DefineWithDesc adds a variable with description
func (s *Schema) DefineWithDesc(name string, varType types.BaseType, desc string) *Schema {
	s.variables[name] = &VariableDefinition{
		Name:        name,
		Type:        varType,
		Default:     varType.GetDefault(),
		Required:    varType.IsRequired(),
		Description: desc,
	}
	return s
}

// GetVariable returns a variable definition
func (s *Schema) GetVariable(name string) *VariableDefinition {
	return s.variables[name]
}

// GetVariables returns all variables
func (s *Schema) GetVariables() map[string]*VariableDefinition {
	vars := make(map[string]*VariableDefinition)
	for k, v := range s.variables {
		vars[k] = v
	}
	return vars
}

// HasVariable checks if variable exists
func (s *Schema) HasVariable(name string) bool {
	_, ok := s.variables[name]
	return ok
}

// Validate validates values against schema
func (s *Schema) Validate(values map[string]interface{}) (map[string]interface{}, error) {
	errors := make(map[string]string)
	validated := make(map[string]interface{})

	for name, varDef := range s.variables {
		if val, ok := values[name]; ok {
			result := varDef.Type.Validate(val)
			if result.Valid {
				validated[name] = result.Value
			} else {
				errors[name] = result.Error
			}
		} else if varDef.Default != nil {
			validated[name] = varDef.Default
		} else if varDef.Required {
			errors[name] = "Required"
		}
	}

	if len(errors) > 0 {
		return nil, fmt.Errorf("validation errors: %v", errors)
	}

	return validated, nil
}

// ToMap converts schema to map representation
func (s *Schema) ToMap() map[string]interface{} {
	vars := make(map[string]interface{})
	for name, varDef := range s.variables {
		vars[name] = map[string]interface{}{
			"name":        varDef.Name,
			"required":    varDef.Required,
			"default":     varDef.Default,
			"description": varDef.Description,
		}
	}
	return map[string]interface{}{
		"version":   "1.0",
		"variables": vars,
	}
}

// ToJSON converts schema to JSON string
func (s *Schema) ToJSON() (string, error) {
	data := s.ToMap()
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return "", err
	}
	return string(b), nil
}
