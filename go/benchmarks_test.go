package main

import (
	"testing"

	"github.com/ter-sdk/ter-go/adapters"
	"github.com/ter-sdk/ter-go/runtime"
	"github.com/ter-sdk/ter-go/schema"
	"github.com/ter-sdk/ter-go/types"
)

// BenchmarkStringValidation benchmarks string type validation
func BenchmarkStringValidation(b *testing.B) {
	t := types.NewStringType()
	for i := 0; i < b.N; i++ {
		t.Validate("hello")
	}
}

// BenchmarkIntValidation benchmarks integer type validation
func BenchmarkIntValidation(b *testing.B) {
	t := types.NewIntType()
	for i := 0; i < b.N; i++ {
		t.Validate(42)
	}
}

// BenchmarkURLValidation benchmarks URL type validation
func BenchmarkURLValidation(b *testing.B) {
	t := types.NewURLType()
	for i := 0; i < b.N; i++ {
		t.Validate("https://example.com")
	}
}

// BenchmarkEnumValidation benchmarks enum type validation
func BenchmarkEnumValidation(b *testing.B) {
	t := types.NewEnumType([]string{"dev", "prod", "staging"})
	for i := 0; i < b.N; i++ {
		t.Validate("prod")
	}
}

// BenchmarkSchemaValidation benchmarks schema validation
func BenchmarkSchemaValidation(b *testing.B) {
	s := schema.NewSchema()
	s.Define("PORT", types.NewIntType().SetDefault(3000))
	s.Define("HOST", types.NewStringType().SetDefault("localhost"))
	s.Define("DATABASE_URL", types.NewURLType().MarkRequired())
	s.Define("API_KEY", types.NewSecretType().MarkRequired())
	s.Define("DEBUG", types.NewBoolType().SetDefault(false))

	values := map[string]interface{}{
		"PORT":           "8000",
		"HOST":           "api.example.com",
		"DATABASE_URL":   "postgres://localhost/db",
		"API_KEY":        "secret123",
		"DEBUG":          "true",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		s.Validate(values)
	}
}

// BenchmarkResolve benchmarks value resolution
func BenchmarkResolve(b *testing.B) {
	s := schema.NewSchema()
	s.Define("PORT", types.NewIntType().SetDefault(3000))

	resolver := runtime.NewResolver(s)
	resolver.AddFileEnv(map[string]string{
		"PORT": "8000",
	})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		resolver.Resolve("PORT")
	}
}

// BenchmarkResolveAll benchmarks resolving all values
func BenchmarkResolveAll(b *testing.B) {
	s := schema.NewSchema()
	s.Define("PORT", types.NewIntType().SetDefault(3000))
	s.Define("HOST", types.NewStringType().SetDefault("localhost"))
	s.Define("DATABASE_URL", types.NewURLType().MarkRequired())
	s.Define("API_KEY", types.NewSecretType().MarkRequired())

	resolver := runtime.NewResolver(s)
	resolver.AddFileEnv(map[string]string{
		"PORT":           "8000",
		"DATABASE_URL":   "postgres://localhost/db",
		"API_KEY":        "secret123",
	})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		resolver.ResolveAll()
	}
}

// BenchmarkParseDotenvSmall benchmarks parsing small .env file
func BenchmarkParseDotenvSmall(b *testing.B) {
	content := "PORT=3000\nHOST=localhost\nDEBUG=true"
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		adapters.ParseDotenv(content)
	}
}

// BenchmarkParseDotenvMedium benchmarks parsing medium .env file
func BenchmarkParseDotenvMedium(b *testing.B) {
	content := `# Production Config
NODE_ENV=production
PORT=8000
HOST=0.0.0.0
DATABASE_URL=postgres://user:pass@host/db
DATABASE_POOL_SIZE=20
REDIS_URL=redis://cache:6379
API_KEY=abc123xyz789
JWT_SECRET=secret-key-here
CORS_ORIGIN=https://example.com
LOG_LEVEL=info
SENTRY_DSN=https://key@sentry.io/12345
AWS_REGION=us-east-1
AWS_BUCKET=my-bucket`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		adapters.ParseDotenv(content)
	}
}

// BenchmarkGenerateDotenv benchmarks generating .env content
func BenchmarkGenerateDotenv(b *testing.B) {
	values := map[string]string{
		"PORT":           "8000",
		"HOST":           "api.example.com",
		"DATABASE_URL":   "postgres://localhost/db",
		"API_KEY":        "secret123",
		"DEBUG":          "true",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		adapters.GenerateDotenv(values, "")
	}
}

// BenchmarkEnvironmentAccess benchmarks type-safe environment access
func BenchmarkEnvironmentAccess(b *testing.B) {
	s := schema.NewSchema()
	s.Define("PORT", types.NewIntType().SetDefault(3000))
	s.Define("HOST", types.NewStringType().SetDefault("localhost"))

	resolver := runtime.NewResolver(s)
	resolver.AddFileEnv(map[string]string{
		"PORT": "8000",
		"HOST": "api.example.com",
	})

	env := runtime.NewEnvironment(s, resolver)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		env.GetInt("PORT")
		env.GetString("HOST")
	}
}

// BenchmarkCompleteWorkflow benchmarks end-to-end workflow
func BenchmarkCompleteWorkflow(b *testing.B) {
	s := schema.NewSchema()
	s.Define("PORT", types.NewIntType().SetDefault(3000))
	s.Define("HOST", types.NewStringType().SetDefault("localhost"))
	s.Define("DATABASE_URL", types.NewURLType().MarkRequired())
	s.Define("API_KEY", types.NewSecretType().MarkRequired())

	content := `PORT=8000
HOST=api.example.com
DATABASE_URL=postgres://localhost/db
API_KEY=secret123`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Parse
		result := adapters.ParseDotenv(content)

		// Resolve
		resolver := runtime.NewResolver(s)
		resolver.AddFileEnv(result.Values)

		// Validate
		env := runtime.NewEnvironment(s, resolver)
		env.Validate()
	}
}
