Gem::Specification.new do |spec|
  spec.name          = 'ter'
  spec.version       = '0.1.0'
  spec.authors       = ['TER Contributors']
  spec.email         = ['info@ter.dev']
  spec.summary       = 'Typed Environment Runtime - Type-safe configuration management'
  spec.description   = 'Production-grade environment variable validation and management with multiple backends'
  spec.homepage      = 'https://github.com/example/ter'
  spec.license       = 'MIT'

  spec.files         = Dir.glob('lib/**/*.rb') + ['README.md', 'LICENSE']
  spec.require_paths = ['lib']

  spec.required_ruby_version = '>= 2.7'
end
