import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';

export const MAX_WRITE_CONTENT_BYTES = 100 * 1024;

function formatLimit(): string {
  return `${MAX_WRITE_CONTENT_BYTES / 1024} KB`;
}

function ensureWithinLimit(byteLength: number, sourceLabel: string): void {
  if (byteLength > MAX_WRITE_CONTENT_BYTES) {
    throw new Error(`${sourceLabel} exceeds ${formatLimit()} limit`);
  }
}

async function readUtf8FromStream(stream: Readable, sourceLabel: string): Promise<string> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    ensureWithinLimit(totalBytes, sourceLabel);
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
}

export async function readContentFileOrStdin(
  pathOrDash: string,
  stdin: Readable = process.stdin
): Promise<string> {
  if (pathOrDash === '-') {
    return readUtf8FromStream(stdin, 'Stdin content');
  }

  try {
    const buffer = await readFile(pathOrDash);
    ensureWithinLimit(buffer.byteLength, `Content file "${pathOrDash}"`);
    return buffer.toString('utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read content file "${pathOrDash}": ${message}`);
  }
}

interface OptionalContentArgs {
  inlineText: string | undefined;
  filePath: string | undefined;
  inlineFlag: string;
  fileFlag: string;
  stdin?: Readable;
}

export async function resolveOptionalInlineOrFileContent({
  inlineText,
  filePath,
  inlineFlag,
  fileFlag,
  stdin,
}: OptionalContentArgs): Promise<string | undefined> {
  if (inlineText !== undefined && filePath !== undefined) {
    throw new Error(`Cannot use ${inlineFlag} and ${fileFlag} together`);
  }
  if (filePath !== undefined) {
    return readContentFileOrStdin(filePath, stdin);
  }

  // convert literal \n strings into actual newline characters
  return inlineText?.replace(/\\n/g, '\n');
}

interface UpdateContentArgs {
  appendText: string | undefined;
  appendFile: string | undefined;
  replaceText: string | undefined;
  replaceFile: string | undefined;
  stdin?: Readable;
}

interface ResolvedUpdateContent {
  appendContent: string | undefined;
  replaceContent: string | undefined;
}

export async function resolveUpdateContent({
  appendText,
  appendFile,
  replaceText,
  replaceFile,
  stdin,
}: UpdateContentArgs): Promise<ResolvedUpdateContent> {
  const appendContent = await resolveOptionalInlineOrFileContent({
    inlineText: appendText,
    filePath: appendFile,
    inlineFlag: '--append',
    fileFlag: '--append-file',
    stdin,
  });

  const replaceContent = await resolveOptionalInlineOrFileContent({
    inlineText: replaceText,
    filePath: replaceFile,
    inlineFlag: '--replace',
    fileFlag: '--replace-file',
    stdin,
  });

  if (appendContent !== undefined && replaceContent !== undefined) {
    throw new Error(
      'Cannot combine append and replace content options (--append/--append-file with --replace/--replace-file)'
    );
  }

  return { appendContent, replaceContent };
}

interface JournalContentArgs {
  positionalContent: string | undefined;
  optionContent: string | undefined;
  contentFile: string | undefined;
  stdin?: Readable;
}

export async function resolveJournalContent({
  positionalContent,
  optionContent,
  contentFile,
  stdin,
}: JournalContentArgs): Promise<string> {
  const providedCount = [positionalContent, optionContent, contentFile].filter(
    (value) => value !== undefined
  ).length;

  if (providedCount !== 1) {
    throw new Error(
      'Provide exactly one journal content source: positional <content>, --content <text>, or --content-file <path|->'
    );
  }

  if (contentFile !== undefined) {
    return readContentFileOrStdin(contentFile, stdin);
  }

  if (optionContent !== undefined) {
    return optionContent;
  }

  return positionalContent as string;
}
