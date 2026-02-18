import { describe, expect, it } from 'vitest';
import { Command } from 'commander';
import { createProgram } from '../../src/cli.js';

describe('createProgram', () => {
  it('creates a configured Command instance', () => {
    const program = createProgram('0.1.0');

    expect(program).toBeInstanceOf(Command);
    expect(program.name()).toBe('remnote-cli');
    expect(program.description()).toContain('CLI companion');
  });

  it('registers all expected subcommands', () => {
    const program = createProgram('0.1.0');
    const commandNames = program.commands.map((c) => c.name());

    expect(commandNames).toContain('daemon');
    expect(commandNames).toContain('create');
    expect(commandNames).toContain('search');
    expect(commandNames).toContain('read');
    expect(commandNames).toContain('update');
    expect(commandNames).toContain('journal');
    expect(commandNames).toContain('status');
  });

  it('has global --text and --json options', () => {
    const program = createProgram('0.1.0');
    const optionNames = program.options.map((o) => o.long);

    expect(optionNames).toContain('--json');
    expect(optionNames).toContain('--text');
    expect(optionNames).toContain('--control-port');
    expect(optionNames).toContain('--verbose');
  });

  it('daemon command has start, stop, status subcommands', () => {
    const program = createProgram('0.1.0');
    const daemonCmd = program.commands.find((c) => c.name() === 'daemon');
    expect(daemonCmd).toBeDefined();

    const subNames = daemonCmd!.commands.map((c) => c.name());
    expect(subNames).toContain('start');
    expect(subNames).toContain('stop');
    expect(subNames).toContain('status');
  });
});
