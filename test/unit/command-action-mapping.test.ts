import { afterEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DaemonClient } from '../../src/client/daemon-client.js';
import { createProgram } from '../../src/cli.js';

const tempDirs: string[] = [];

async function createTempContentFile(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'remnote-cli-command-map-'));
  tempDirs.push(dir);
  const path = join(dir, 'content.md');
  await writeFile(path, content, 'utf8');
  return path;
}

async function runCommand(args: string[]): Promise<MockInstance> {
  const executeSpy = vi.spyOn(DaemonClient.prototype, 'execute').mockResolvedValue({ ok: true });
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const program = createProgram('0.1.0-test');

  await program.parseAsync(['node', 'remnote-cli', ...args], { from: 'node' });

  logSpy.mockRestore();
  return executeSpy;
}

describe('command bridge action mapping', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

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

  it('maps create --content-file to create_note content payload', async () => {
    const filePath = await createTempContentFile('Body from file');
    const executeSpy = await runCommand(['create', 'Title', '--content-file', filePath]);
    expect(executeSpy).toHaveBeenCalledWith('create_note', {
      title: 'Title',
      content: 'Body from file',
    });
    executeSpy.mockRestore();
  });

  it('maps create command with flashcard options to create_note', async () => {
    const executeSpy = await runCommand([
      'create',
      'Front',
      '--back-text',
      'Back',
      '--concept',
    ]);
    expect(executeSpy).toHaveBeenCalledWith('create_note', {
      title: 'Front',
      backText: 'Back',
      isConcept: true,
    });
    executeSpy.mockRestore();
  });

  it('maps create-md command to create_note_md', async () => {
    const executeSpy = await runCommand([
      'create-md',
      '--title',
      'Root',
      '--content',
      '- Item 1\n  - Item 2\n',
      '--tags',
      'md-tag',
    ]);
    expect(executeSpy).toHaveBeenCalledWith('create_note_md', {
      title: 'Root',
      content: '- Item 1\n  - Item 2\n',
      tags: ['md-tag'],
    });
    executeSpy.mockRestore();
  });

  it('maps create-md --content-file to create_note_md', async () => {
    const filePath = await createTempContentFile('- Item from file');
    const executeSpy = await runCommand(['create-md', '--content-file', filePath]);
    expect(executeSpy).toHaveBeenCalledWith('create_note_md', {
      content: '- Item from file',
    });
    executeSpy.mockRestore();
  });

  it('maps read command to read_note', async () => {
    const executeSpy = await runCommand(['read', 'abc123', '--depth', '2']);
    expect(executeSpy).toHaveBeenCalledWith('read_note', { remId: 'abc123', depth: 2 });
    executeSpy.mockRestore();
  });

  it('passes through structured read content mode', async () => {
    const executeSpy = await runCommand(['read', 'abc123', '--include-content', 'structured']);
    expect(executeSpy).toHaveBeenCalledWith('read_note', {
      remId: 'abc123',
      depth: 5,
      includeContent: 'structured',
    });
    executeSpy.mockRestore();
  });

  it('maps search command to search with content rendering options', async () => {
    const executeSpy = await runCommand([
      'search',
      'ml',
      '--include-content',
      'markdown',
      '--depth',
      '1',
    ]);
    expect(executeSpy).toHaveBeenCalledWith('search', {
      query: 'ml',
      limit: 50,
      includeContent: 'markdown',
      depth: 1,
    });
    executeSpy.mockRestore();
  });

  it('passes through structured search content mode', async () => {
    const executeSpy = await runCommand(['search', 'folders', '--include-content', 'structured']);
    expect(executeSpy).toHaveBeenCalledWith('search', {
      query: 'folders',
      limit: 50,
      includeContent: 'structured',
    });
    executeSpy.mockRestore();
  });

  it('maps search-tag command to search_by_tag with content rendering options', async () => {
    const executeSpy = await runCommand([
      'search-tag',
      '#daily',
      '--include-content',
      'markdown',
      '--depth',
      '2',
    ]);
    expect(executeSpy).toHaveBeenCalledWith('search_by_tag', {
      tag: '#daily',
      limit: 50,
      includeContent: 'markdown',
      depth: 2,
    });
    executeSpy.mockRestore();
  });

  it('passes through structured search-tag content mode', async () => {
    const executeSpy = await runCommand([
      'search-tag',
      'project-tag',
      '--include-content',
      'structured',
    ]);
    expect(executeSpy).toHaveBeenCalledWith('search_by_tag', {
      tag: 'project-tag',
      limit: 50,
      includeContent: 'structured',
    });
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

  it('maps update --append-file to update_note appendContent payload', async () => {
    const filePath = await createTempContentFile('Append from file');
    const executeSpy = await runCommand(['update', 'abc123', '--append-file', filePath]);
    expect(executeSpy).toHaveBeenCalledWith('update_note', {
      remId: 'abc123',
      appendContent: 'Append from file',
    });
    executeSpy.mockRestore();
  });

  it('maps update --replace to update_note replaceContent payload', async () => {
    const executeSpy = await runCommand(['update', 'abc123', '--replace', 'Replaced content']);
    expect(executeSpy).toHaveBeenCalledWith('update_note', {
      remId: 'abc123',
      replaceContent: 'Replaced content',
    });
    executeSpy.mockRestore();
  });

  it('maps update --replace-file to update_note replaceContent payload', async () => {
    const filePath = await createTempContentFile('Replace from file');
    const executeSpy = await runCommand(['update', 'abc123', '--replace-file', filePath]);
    expect(executeSpy).toHaveBeenCalledWith('update_note', {
      remId: 'abc123',
      replaceContent: 'Replace from file',
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

  it('maps journal --content to append_journal', async () => {
    const executeSpy = await runCommand(['journal', '--content', 'Entry from flag']);
    expect(executeSpy).toHaveBeenCalledWith('append_journal', {
      content: 'Entry from flag',
      timestamp: true,
    });
    executeSpy.mockRestore();
  });

  it('maps journal --content-file to append_journal', async () => {
    const filePath = await createTempContentFile('Journal from file');
    const executeSpy = await runCommand(['journal', '--content-file', filePath]);
    expect(executeSpy).toHaveBeenCalledWith('append_journal', {
      content: 'Journal from file',
      timestamp: true,
    });
    executeSpy.mockRestore();
  });
});
