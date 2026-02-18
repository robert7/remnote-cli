import { describe, expect, it } from 'vitest';
import { formatResult, formatError } from '../../src/output/formatter.js';

describe('formatResult', () => {
  it('formats as JSON by default', () => {
    const result = formatResult({ key: 'value' }, 'json');
    expect(JSON.parse(result)).toEqual({ key: 'value' });
  });

  it('formats JSON with indentation', () => {
    const result = formatResult({ a: 1 }, 'json');
    expect(result).toContain('\n');
  });

  it('uses text formatter when provided', () => {
    const result = formatResult({ name: 'test' }, 'text', (data) => {
      const d = data as Record<string, unknown>;
      return `Name: ${d.name}`;
    });
    expect(result).toBe('Name: test');
  });

  it('falls back to key-value display in text mode', () => {
    const result = formatResult({ name: 'test', count: 5 }, 'text');
    expect(result).toContain('name: test');
    expect(result).toContain('count: 5');
  });

  it('handles primitive values in text mode', () => {
    const result = formatResult('hello', 'text');
    expect(result).toBe('hello');
  });
});

describe('formatError', () => {
  it('formats error as JSON', () => {
    const result = formatError('Something failed', 'json', 1);
    const parsed = JSON.parse(result);
    expect(parsed.error).toBe('Something failed');
    expect(parsed.code).toBe(1);
  });

  it('formats error as JSON without code', () => {
    const result = formatError('Something failed', 'json');
    const parsed = JSON.parse(result);
    expect(parsed.error).toBe('Something failed');
    expect(parsed.code).toBeUndefined();
  });

  it('formats error as text', () => {
    const result = formatError('Something failed', 'text');
    expect(result).toBe('Error: Something failed');
  });
});
