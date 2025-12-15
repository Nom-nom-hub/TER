/**
 * Environment Inheritance Tests
 */

import { Types, createSchema, createGraph } from '../src/core';

describe('Environment Inheritance', () => {
  test('Basic environment graph', () => {
    const schema = createSchema({
      DATABASE_URL: Types.url(),
      PORT: Types.int(),
    });

    const graph = createGraph(schema);
    graph.define('base', {
      values: {
        DATABASE_URL: 'postgres://localhost/db',
        PORT: '3000',
      },
    });

    const resolved = graph.resolve('base');
    expect(resolved.DATABASE_URL).toBe('postgres://localhost/db');
    expect(resolved.PORT).toBe('3000');
  });

  test('Environment inheritance (child extends parent)', () => {
    const schema = createSchema({
      DATABASE_URL: Types.url(),
      PORT: Types.int(),
      LOG_LEVEL: Types.string(),
    });

    const graph = createGraph(schema);
    graph.define('base', {
      values: {
        DATABASE_URL: 'postgres://localhost/db',
        PORT: '3000',
        LOG_LEVEL: 'info',
      },
    });

    graph.define('production', {
      extends: 'base',
      values: {
        DATABASE_URL: 'postgres://prod-server/db',
        PORT: '5432',
      },
    });

    const resolved = graph.resolve('production');
    expect(resolved.DATABASE_URL).toBe('postgres://prod-server/db'); // Override
    expect(resolved.PORT).toBe('5432'); // Override
    expect(resolved.LOG_LEVEL).toBe('info'); // Inherited
  });

  test('Multiple inheritance levels', () => {
    const schema = createSchema({
      A: Types.string(),
      B: Types.string(),
      C: Types.string(),
    });

    const graph = createGraph(schema);
    graph
      .define('base', { values: { A: 'a1', B: 'b1', C: 'c1' } })
      .define('staging', { extends: 'base', values: { B: 'b2' } })
      .define('staging-debug', { extends: 'staging', values: { C: 'c2' } });

    const resolved = graph.resolve('staging-debug');
    expect(resolved.A).toBe('a1'); // From base
    expect(resolved.B).toBe('b2'); // From staging
    expect(resolved.C).toBe('c2'); // From staging-debug
  });

  test('Circular dependency detection', () => {
    const schema = createSchema({});

    const graph = createGraph(schema);
    graph
      .define('env1', { values: {}, extends: 'env2' })
      .define('env2', { values: {}, extends: 'env1' });

    expect(() => graph.resolve('env1')).toThrow('Circular dependency');
  });

  test('Environment diffing', () => {
    const schema = createSchema({
      DATABASE_URL: Types.url(),
      PORT: Types.int(),
      LOG_LEVEL: Types.string(),
    });

    const graph = createGraph(schema);
    graph
      .define('dev', {
        values: {
          DATABASE_URL: 'postgres://localhost/db',
          PORT: '3000',
          LOG_LEVEL: 'debug',
        },
      })
      .define('prod', {
        values: {
          DATABASE_URL: 'postgres://prod/db',
          PORT: '5432',
          LOG_LEVEL: 'warn',
        },
      });

    const diff = graph.diff('dev', 'prod');
    expect(diff.added).toEqual({});
    expect(diff.removed).toEqual({});
    expect(diff.modified.DATABASE_URL).toEqual([
      'postgres://localhost/db',
      'postgres://prod/db',
    ]);
    expect(diff.modified.PORT).toEqual(['3000', '5432']);
    expect(diff.modified.LOG_LEVEL).toEqual(['debug', 'warn']);
  });

  test('Diffing with added/removed variables', () => {
    const schema = createSchema({});

    const graph = createGraph(schema);
    graph
      .define('env1', {
        values: {
          A: 'a1',
          B: 'b1',
        },
      })
      .define('env2', {
        values: {
          B: 'b2',
          C: 'c2',
        },
      });

    const diff = graph.diff('env1', 'env2');
    expect(diff.added).toEqual({ C: 'c2' });
    expect(diff.removed).toEqual({ A: 'a1' });
    expect(diff.modified).toEqual({ B: ['b1', 'b2'] });
  });

  test('Get all environments', () => {
    const schema = createSchema({});

    const graph = createGraph(schema);
    graph
      .define('dev', { values: {} })
      .define('staging', { values: {} })
      .define('prod', { values: {} });

    const all = graph.all();
    expect(all.length).toBe(3);
    expect(all.map((e) => e.name).sort()).toEqual(['dev', 'prod', 'staging']);
  });

  test('Non-existent environment error', () => {
    const schema = createSchema({});
    const graph = createGraph(schema);

    expect(() => graph.resolve('nonexistent')).toThrow(
      'Environment "nonexistent" not found'
    );
  });

  test('Graph export', () => {
    const schema = createSchema({});

    const graph = createGraph(schema);
    graph
      .define('base', { values: { A: 'a', B: 'b' } })
      .define('derived', { extends: 'base', values: { C: 'c' } });

    const json = graph.toJSON();
    expect(json.environments).toHaveLength(2);
    expect(json.environments[0].name).toBe('base');
    expect(json.environments[1].extends).toBe('base');
  });
});
