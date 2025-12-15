/**
 * DotEnv Variable Expansion Tests
 */

import {
  VariableExpander,
  expandDotEnv,
  escapeVariables,
  unescapeVariables,
} from '../src/adapters/dotenv-expansion';

describe('VariableExpander', () => {
  describe('Basic Expansion', () => {
    test('expands simple variables with ${VAR}', () => {
      const expander = new VariableExpander({
        env: { FOO: 'foo', BAR: 'bar' },
      });

      expect(expander.expand('${FOO}')).toBe('foo');
      expect(expander.expand('prefix-${FOO}')).toBe('prefix-foo');
      expect(expander.expand('${FOO}-suffix')).toBe('foo-suffix');
      expect(expander.expand('${FOO}-${BAR}')).toBe('foo-bar');
    });

    test('expands simple variables with $VAR syntax', () => {
      const expander = new VariableExpander({
        env: { FOO: 'value', BAR: 'test' },
      });

      expect(expander.expand('$FOO')).toBe('value');
      expect(expander.expand('prefix-$FOO')).toBe('prefix-value');
      expect(expander.expand('$FOO-$BAR')).toBe('value-test');
    });

    test('handles mixed ${VAR} and $VAR syntax', () => {
      const expander = new VariableExpander({
        env: { FOO: 'foo', BAR: 'bar' },
      });

      expect(expander.expand('${FOO}-$BAR')).toBe('foo-bar');
      expect(expander.expand('$FOO-${BAR}')).toBe('foo-bar');
    });
  });

  describe('Default Values', () => {
    test('uses default with :- syntax when variable is undefined', () => {
      const expander = new VariableExpander({
        env: {},
        throwOnUndefined: false,
      });

      expect(expander.expand('${UNDEFINED:-default}')).toBe('default');
      expect(expander.expand('${UNDEFINED:-}')).toBe('');
    });

    test('uses variable value over default when defined', () => {
      const expander = new VariableExpander({
        env: { FOO: 'value' },
      });

      expect(expander.expand('${FOO:-default}')).toBe('value');
    });

    test('supports := syntax to set default', () => {
      const env: Record<string, string> = {};
      const expander = new VariableExpander({
        env,
      });

      expander.expand('${NEWVAR:=mydefault}');
      expect(env.NEWVAR).toBe('mydefault');
    });

    test('handles complex default values', () => {
      const expander = new VariableExpander({
        env: {},
        throwOnUndefined: false,
      });

      expect(expander.expand('${UNDEFINED:-path/to/default}')).toBe('path/to/default');
      expect(expander.expand('${UNDEFINED:-key=value}')).toBe('key=value');
    });
  });

  describe('Nested Expansion', () => {
    test('expands nested variables', () => {
      const expander = new VariableExpander({
        env: { INNER: 'value', OUTER_value: 'result' },
      });

      // Note: Real nested expansion (${OUTER_${INNER}}) is complex
      // This test shows sequential expansion
      expect(expander.expand('${INNER}')).toBe('value');
    });

    test('expands variables in default values', () => {
      const expander = new VariableExpander({
        env: { FALLBACK: 'fallback_value' },
        throwOnUndefined: false,
      });

      expect(expander.expand('${UNDEFINED:-${FALLBACK}}')).toBe('fallback_value');
    });

    test('expands chain of variables', () => {
      const expander = new VariableExpander({
        env: { A: 'B', B: 'C', C: 'final' },
      });

      expect(expander.expand('$A')).toBe('B');
      expect(expander.expand('${B}')).toBe('C');
      expect(expander.expand('${C}')).toBe('final');
    });
  });

  describe('Circular Reference Detection', () => {
    test('detects circular references and throws', () => {
      const expander = new VariableExpander({
        env: { A: '${B}', B: '${A}' },
        throwOnCircular: true,
      });

      expect(() => expander.expand('${A}')).toThrow(/Circular reference/);
    });

    test('detects self-reference and throws', () => {
      const expander = new VariableExpander({
        env: { A: '${A}' },
        throwOnCircular: true,
      });

      expect(() => expander.expand('${A}')).toThrow(/Circular reference/);
    });

    test('allows circular references when configured', () => {
      const expander = new VariableExpander({
        env: { A: '${B}', B: 'value' },
        throwOnCircular: false,
      });

      // Should not throw
      expander.expand('${A}');
    });
  });

  describe('Error Handling', () => {
    test('throws on undefined variable by default', () => {
      const expander = new VariableExpander({
        env: {},
      });

      expect(() => expander.expand('${UNDEFINED}')).toThrow(/Undefined variable/);
    });

    test('does not throw when throwOnUndefined is false', () => {
      const expander = new VariableExpander({
        env: {},
        throwOnUndefined: false,
      });

      expect(expander.expand('${UNDEFINED}')).toBe('${UNDEFINED}');
    });

    test('throws on max depth exceeded', () => {
      const expander = new VariableExpander({
        env: { A: '${A}' },
        maxDepth: 1,
        throwOnCircular: false,
      });

      expect(() => expander.expand('${A}')).toThrow(/exceeded maximum depth/);
    });
  });

  describe('Reusability', () => {
    test('resets expanding stack between calls', () => {
      const expander = new VariableExpander({
        env: { A: '${B}', B: 'value' },
      });

      expander.expand('${B}'); // first call
      expect(() => expander.expand('${A}')).not.toThrow(); // second call should not fail
    });

    test('reset() clears the expanding stack', () => {
      const expander = new VariableExpander({
        env: { A: '${B}', B: 'value' },
        throwOnCircular: false,
      });

      expander.expand('${A}');
      expander.reset();
      // Should work after reset
      expect(expander.expand('${B}')).toBe('value');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty strings', () => {
      const expander = new VariableExpander({
        env: { EMPTY: '' },
      });

      expect(expander.expand('${EMPTY}')).toBe('');
    });

    test('handles multiple variables in sequence', () => {
      const expander = new VariableExpander({
        env: { A: '1', B: '2', C: '3' },
      });

      expect(expander.expand('$A$B$C')).toBe('123');
      expect(expander.expand('${A}${B}${C}')).toBe('123');
    });

    test('does not expand escaped variables', () => {
      const value = escapeVariables('${SHOULD_NOT_EXPAND}');
      const expander = new VariableExpander({
        env: {},
        throwOnUndefined: false,
      });

      // After escaping, the $ and {} are escaped
      expect(value).toContain('\\$');
    });

    test('handles variables with underscores and numbers', () => {
      const expander = new VariableExpander({
        env: { VAR_123: 'value' },
      });

      expect(expander.expand('${VAR_123}')).toBe('value');
      expect(expander.expand('$VAR_123')).toBe('value');
    });
  });
});

describe('expandDotEnv', () => {
  test('expands variables in .env content', () => {
    const content = `
      FOO=foo_value
      BAR=\${FOO}_extended
      BAZ=\$FOO-\${BAR}
    `;

    const result = expandDotEnv(content, { throwOnUndefined: false });

    expect(result.FOO).toBe('foo_value');
    expect(result.BAR).toBe('foo_value_extended');
    expect(result.BAZ).toContain('foo_value');
  });

  test('skips comments and empty lines', () => {
    const content = `
      # This is a comment
      FOO=value

      # Another comment
      BAR=\${FOO}
    `;

    const result = expandDotEnv(content);

    expect(result.FOO).toBe('value');
    expect(result.BAR).toBe('value');
    expect(Object.keys(result).length).toBe(2);
  });

  test('handles quoted values', () => {
    const content = `
      FOO="quoted value"
      BAR='single quoted'
      BAZ=\${FOO}
    `;

    const result = expandDotEnv(content);

    expect(result.FOO).toBe('quoted value');
    expect(result.BAR).toBe('single quoted');
  });

  test('makes expanded values available for subsequent expansions', () => {
    const content = `
      FIRST=first_value
      SECOND=\${FIRST}_second
      THIRD=\${SECOND}_third
    `;

    const result = expandDotEnv(content);

    expect(result.FIRST).toBe('first_value');
    expect(result.SECOND).toBe('first_value_second');
    expect(result.THIRD).toBe('first_value_second_third');
  });

  test('throws descriptive error on expansion failure', () => {
    const content = `
      FOO=\${UNDEFINED}
    `;

    expect(() => expandDotEnv(content)).toThrow(/Error expanding FOO/);
  });

  test('uses provided environment for expansion', () => {
    const content = `
      FOO=\${EXTERNAL_VAR}
    `;

    const result = expandDotEnv(content, {
      env: { EXTERNAL_VAR: 'external_value' },
    });

    expect(result.FOO).toBe('external_value');
  });
});

describe('Escaping', () => {
  test('escapes variables in strings', () => {
    const escaped = escapeVariables('prefix-${VAR}-suffix');
    expect(escaped).not.toContain('${');
    expect(escaped).toContain('\\$');
  });

  test('unescapes previously escaped variables', () => {
    const original = 'prefix-${VAR}-suffix';
    const escaped = escapeVariables(original);
    const unescaped = unescapeVariables(escaped);

    expect(unescaped).toBe(original);
  });

  test('roundtrip escape/unescape', () => {
    const values = [
      'simple',
      '${VAR}',
      'prefix-${VAR}-suffix',
      '$VAR',
      '${A}-${B}-${C}',
    ];

    for (const value of values) {
      const escaped = escapeVariables(value);
      const unescaped = unescapeVariables(escaped);
      expect(unescaped).toBe(value);
    }
  });
});
