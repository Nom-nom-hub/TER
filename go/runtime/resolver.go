package runtime

import (
	"os"
	"time"

	"github.com/ter-sdk/ter-go/schema"
)

// ResolvedValue represents a resolved environment value
type ResolvedValue struct {
	Value      interface{}
	Source     string    // "process", "file", "injected", "default"
	ResolvedAt time.Time
}

// Resolver resolves environment values from multiple sources
type Resolver struct {
	schema    *schema.Schema
	fileEnv   map[string]string
	injected  map[string]string
}

// NewResolver creates a new resolver
func NewResolver(s *schema.Schema) *Resolver {
	return &Resolver{
		schema:   s,
		fileEnv:  make(map[string]string),
		injected: make(map[string]string),
	}
}

// AddFileEnv adds file-based environment values
func (r *Resolver) AddFileEnv(env map[string]string) *Resolver {
	for k, v := range env {
		r.fileEnv[k] = v
	}
	return r
}

// AddInjected adds injected environment values
func (r *Resolver) AddInjected(env map[string]string) *Resolver {
	for k, v := range env {
		r.injected[k] = v
	}
	return r
}

// Resolve resolves a value from multiple sources
func (r *Resolver) Resolve(name string) *ResolvedValue {
	now := time.Now()

	// Try process.env
	if val, ok := os.LookupEnv(name); ok {
		return &ResolvedValue{
			Value:      val,
			Source:     "process",
			ResolvedAt: now,
		}
	}

	// Try file environment
	if val, ok := r.fileEnv[name]; ok {
		return &ResolvedValue{
			Value:      val,
			Source:     "file",
			ResolvedAt: now,
		}
	}

	// Try injected
	if val, ok := r.injected[name]; ok {
		return &ResolvedValue{
			Value:      val,
			Source:     "injected",
			ResolvedAt: now,
		}
	}

	// Try default from schema
	if r.schema != nil {
		if varDef := r.schema.GetVariable(name); varDef != nil {
			if varDef.Default != nil {
				return &ResolvedValue{
					Value:      varDef.Default,
					Source:     "default",
					ResolvedAt: now,
				}
			}
		}
	}

	return nil
}

// ResolveAll resolves all known variables
func (r *Resolver) ResolveAll() map[string]*ResolvedValue {
	resolved := make(map[string]*ResolvedValue)

	if r.schema != nil {
		for name := range r.schema.GetVariables() {
			if val := r.Resolve(name); val != nil {
				resolved[name] = val
			}
		}
	}

	return resolved
}
