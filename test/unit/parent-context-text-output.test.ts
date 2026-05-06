import { describe, expect, it, vi, type MockInstance } from 'vitest';
import { McpServerClient } from '../../src/client/mcp-server-client.js';
import { createProgram } from '../../src/cli.js';

async function runTextCommand(
  args: string[],
  result: unknown
): Promise<{ output: string; executeSpy: MockInstance }> {
  const executeSpy = vi.spyOn(McpServerClient.prototype, 'execute').mockResolvedValue(result);
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const program = createProgram('0.1.0-test');

  try {
    await program.parseAsync(['node', 'remnote-cli', '--text', ...args], { from: 'node' });
    const output = String(logSpy.mock.calls.at(-1)?.[0] ?? '');
    return { output, executeSpy };
  } finally {
    logSpy.mockRestore();
    errSpy.mockRestore();
  }
}

describe('parent context text output', () => {
  it('shows parent title and parent remId in search --text output when available', async () => {
    const { output, executeSpy } = await runTextCommand(['search', 'child'], {
      results: [
        {
          remId: 'child-1',
          headline: 'Child Note',
          parentRemId: 'parent-1',
          parentTitle: 'Parent Folder',
          remType: 'document',
        },
      ],
    });

    expect(executeSpy).toHaveBeenCalledWith('search', { query: 'child', limit: 50 });
    expect(output).toContain('[doc] Child Note');
    expect(output).toContain('<- Parent Folder [parent-1]');
    expect(output).toContain('[child-1]');
    executeSpy.mockRestore();
  });

  it('shows tags in search --text output when available', async () => {
    const { output, executeSpy } = await runTextCommand(['search', 'child'], {
      results: [
        {
          remId: 'child-1',
          headline: 'Child Note',
          tags: ['work', 'urgent'],
          remType: 'text',
        },
      ],
    });

    expect(output).toContain('Child Note [tags: work, urgent] [child-1]');
    executeSpy.mockRestore();
  });

  it('shows parent line in read --text output when available', async () => {
    const { output, executeSpy } = await runTextCommand(['read', 'child-1'], {
      remId: 'child-1',
      headline: 'Child Note',
      parentRemId: 'parent-1',
      parentTitle: 'Parent Folder',
      remType: 'text',
      content: '',
      contentProperties: { childrenRendered: 0, childrenTotal: 0, contentTruncated: false },
    });

    expect(executeSpy).toHaveBeenCalledWith('read_note', { remId: 'child-1', depth: 5 });
    expect(output).toContain('Title: Child Note');
    expect(output).toContain('Parent: Parent Folder [parent-1]');
    executeSpy.mockRestore();
  });

  it('shows tags line in read --text output when available', async () => {
    const { output, executeSpy } = await runTextCommand(['read', 'child-1'], {
      remId: 'child-1',
      headline: 'Child Note',
      remType: 'text',
      tags: ['reference', 'next-action'],
      content: '',
      contentProperties: { childrenRendered: 0, childrenTotal: 0, contentTruncated: false },
    });

    expect(output).toContain('Tags: reference, next-action');
    executeSpy.mockRestore();
  });
});
