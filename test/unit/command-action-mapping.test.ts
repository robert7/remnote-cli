import { describe, expect, it, vi, type MockInstance } from 'vitest';
import { DaemonClient } from '../../src/client/daemon-client.js';
import { createProgram } from '../../src/cli.js';

async function runCommand(args: string[]): Promise<MockInstance> {
  const executeSpy = vi.spyOn(DaemonClient.prototype, 'execute').mockResolvedValue({ ok: true });
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const program = createProgram('0.1.0-test');

  await program.parseAsync(['node', 'remnote-cli', ...args], { from: 'node' });

  logSpy.mockRestore();
  return executeSpy;
}

describe('command bridge action mapping', () => {
  it('maps create command to create_note', async () => {
    const executeSpy = await runCommand([
      'create',
      'Test Title',
      '--content',
      'Body',
      '--tags',
      'tag-a',
      'tag-b',
    ]);
    expect(executeSpy).toHaveBeenCalledWith('create_note', {
      title: 'Test Title',
      content: 'Body',
      tags: ['tag-a', 'tag-b'],
    });
    executeSpy.mockRestore();
  });

  it('maps read command to read_note', async () => {
    const executeSpy = await runCommand(['read', 'abc123', '--depth', '2']);
    expect(executeSpy).toHaveBeenCalledWith('read_note', { remId: 'abc123', depth: 2 });
    executeSpy.mockRestore();
  });

  it('maps update command to update_note with appendContent payload', async () => {
    const executeSpy = await runCommand([
      'update',
      'abc123',
      '--append',
      'More text',
      '--add-tags',
      'important',
    ]);
    expect(executeSpy).toHaveBeenCalledWith('update_note', {
      remId: 'abc123',
      appendContent: 'More text',
      addTags: ['important'],
    });
    executeSpy.mockRestore();
  });

  it('maps journal command to append_journal', async () => {
    const executeSpy = await runCommand(['journal', 'Entry', '--no-timestamp']);
    expect(executeSpy).toHaveBeenCalledWith('append_journal', {
      content: 'Entry',
      timestamp: false,
    });
    executeSpy.mockRestore();
  });
});
