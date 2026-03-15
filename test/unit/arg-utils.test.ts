import { describe, expect, it } from 'vitest';
import { Command, InvalidArgumentError } from 'commander';
import { isFlag, checkPayloadForFlags, validateNotFlag } from '../../src/commands/arg-utils.js';

describe('arg-utils', () => {
  describe('isFlag', () => {
    it('returns false for any value when no command context is provided (Strict Mode)', () => {
      // In strict mode without context, we don't assume anything is a flag
      expect(isFlag('--anything')).toBe(false);
      expect(isFlag('-c')).toBe(false);
      expect(isFlag('normal string')).toBe(false);
    });

    it('matches registered flags specifically when Command context is provided', () => {
      const program = new Command();
      program.option('--json', 'json output');

      const sub = program.command('test');
      sub.option('-c, --content <text>', 'content');

      // Check subcommand flags
      expect(isFlag('-c', sub)).toBe(true);
      expect(isFlag('--content', sub)).toBe(true);

      // Check parent/global flags
      expect(isFlag('--json', sub)).toBe(true);

      // Unknown flags starting with -- should return false in Strict Mode
      expect(isFlag('--unknown', sub)).toBe(false);
    });

    it('returns false for Markdown bullets and numbers even with context', () => {
      const cmd = new Command();
      cmd.option('-c, --content <text>', 'content');
      cmd.option('-n <num>', 'number');

      // These should be false because they are not registered flags
      expect(isFlag('- item', cmd)).toBe(false);
      expect(isFlag('* item', cmd)).toBe(false);
      expect(isFlag('-bullet', cmd)).toBe(false);
      expect(isFlag('-1', cmd)).toBe(false);
      expect(isFlag('-123.45', cmd)).toBe(false);
    });
  });

  describe('checkPayloadForFlags', () => {
    it('throws error when a value is a registered flag in the provided context', () => {
      const cmd = new Command();
      cmd.option('--parent-id <id>', 'parent id');

      expect(() => checkPayloadForFlags({ title: '--parent-id' }, cmd)).toThrow(
        /Argument shifting detected/
      );
    });

    it('does not throw when no command context is provided', () => {
      // Without context, --parent-id is not recognized as a flag
      expect(() => checkPayloadForFlags({ title: '--parent-id' })).not.toThrow();
    });

    it('does not throw for valid values (Markdown, numbers)', () => {
      const cmd = new Command();
      cmd.option('--content <text>', 'content');
      
      expect(() =>
        checkPayloadForFlags({ 
          content: '- list item', 
          count: '-5', 
          text: 'Normal text' 
        }, cmd)
      ).not.toThrow();
    });

    it('does not throw for empty strings', () => {
      expect(() => checkPayloadForFlags({ title: '', content: '' })).not.toThrow();
    });
  });

  describe('validateNotFlag', () => {
    it('throws InvalidArgumentError when value is a registered flag in context', () => {
      const cmd = new Command();
      cmd.option('--any-flag <val>', 'description');

      expect(() => validateNotFlag('--any-flag', cmd)).toThrow(InvalidArgumentError);
    });

    it('returns the value when it is NOT a registered flag', () => {
      const cmd = new Command();
      cmd.option('--known', 'known');

      expect(validateNotFlag('Normal Text', cmd)).toBe('Normal Text');
      expect(validateNotFlag('- item', cmd)).toBe('- item');
      expect(validateNotFlag('-123', cmd)).toBe('-123');
    });

    it('returns the value when no context is provided', () => {
      expect(validateNotFlag('--any-flag')).toBe('--any-flag');
    });
  });
});
