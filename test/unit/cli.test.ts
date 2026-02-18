import { describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { createProgram, HELLO_MESSAGE, runCli } from '../../src/cli.js';

describe('createProgram', () => {
  it('creates a configured Command instance', () => {
    const program = createProgram('0.1.0');

    expect(program).toBeInstanceOf(Command);
    expect(program.name()).toBe('remnote-cli');
    expect(program.description()).toContain('CLI companion');
  });

  it('prints hello message when invoked with no args', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = createProgram('0.1.0');

    program.parse([], { from: 'user' });

    expect(logSpy).toHaveBeenCalledWith(HELLO_MESSAGE);
  });
});

describe('runCli', () => {
  it('parses argv and executes default action', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    runCli(['node', 'remnote-cli']);

    expect(logSpy).toHaveBeenCalledWith(HELLO_MESSAGE);
  });
});
