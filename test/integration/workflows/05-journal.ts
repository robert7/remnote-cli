/**
 * Workflow 05: Journal
 *
 * Appends entries to today's daily document via the CLI.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertContains, assertHasField, assertTruthy } from '../assertions.js';
import type { WorkflowContext, WorkflowResult, SharedState, StepResult } from '../types.js';

async function withTempContentFile<T>(
  content: string,
  fn: (path: string) => Promise<T>
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'remnote-cli-it-journal-'));
  const path = join(dir, 'entry.md');
  try {
    await writeFile(path, content, 'utf8');
    return await fn(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function assertJournalReadback(
  ctx: WorkflowContext,
  remId: string,
  expectedFragments: string[],
  label: string
): Promise<void> {
  const reread = (await ctx.cli.runExpectSuccess([
    'read',
    remId,
    '--include-content',
    'markdown',
    '--depth',
    '4',
  ])) as Record<string, unknown>;
  const combined = [reread.title, reread.content]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join('\n');

  for (const fragment of expectedFragments) {
    assertContains(combined, fragment, `${label} should include ${fragment}`);
  }
}

export async function journalWorkflow(
  ctx: WorkflowContext,
  state: SharedState
): Promise<WorkflowResult> {
  const steps: StepResult[] = [];

  // Step 1: Append with timestamp
  {
    const start = Date.now();
    try {
      const expectedEntry = `[CLI-TEST] Journal entry with timestamp ${ctx.runId}`;
      const result = (await withTempContentFile(
        expectedEntry,
        async (contentPath) =>
          (await ctx.cli.runExpectSuccess(['journal', '--content-file', contentPath])) as Record<
            string,
            unknown
          >
      )) as Record<string, unknown>;
      assertHasField(result, 'remIds', 'journal append with timestamp');
      state.journalEntryAId = (result.remIds as string[])[0];
      assertTruthy(
        typeof state.journalEntryAId === 'string',
        'timestamp journal entry should record remId'
      );
      await assertJournalReadback(
        ctx,
        state.journalEntryAId as string,
        [expectedEntry],
        'timestamped journal entry'
      );
      steps.push({ label: 'Append with timestamp', passed: true, durationMs: Date.now() - start });
    } catch (e) {
      steps.push({
        label: 'Append with timestamp',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 2: Append without timestamp
  {
    const start = Date.now();
    try {
      const expectedEntry = `[CLI-TEST] No-timestamp entry ${ctx.runId}`;
      const result = (await withTempContentFile(
        expectedEntry,
        async (contentPath) =>
          (await ctx.cli.runExpectSuccess([
            'journal',
            '--content-file',
            contentPath,
            '--no-timestamp',
          ])) as Record<string, unknown>
      )) as Record<string, unknown>;
      assertHasField(result, 'remIds', 'journal append without timestamp');
      state.journalEntryBId = (result.remIds as string[])[0];
      assertTruthy(
        typeof state.journalEntryBId === 'string',
        'no-timestamp journal entry should record remId'
      );
      await assertJournalReadback(
        ctx,
        state.journalEntryBId as string,
        [expectedEntry],
        'non-timestamped journal entry'
      );
      steps.push({
        label: 'Append without timestamp',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Append without timestamp',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 3: Append with markdown content
  {
    const start = Date.now();
    try {
      const expectedEntry = `[CLI-TEST] Markdown entry ${ctx.runId}`;
      const result = (await withTempContentFile(
        `${expectedEntry}\n\n## Section\n- Item 1\n- Item 2`,
        async (contentPath) =>
          (await ctx.cli.runExpectSuccess(['journal', '--content-file', contentPath])) as Record<
            string,
            unknown
          >
      )) as Record<string, unknown>;
      assertHasField(result, 'remIds', 'journal append with markdown');
      state.journalEntryCId = (result.remIds as string[])[0];
      assertTruthy(
        typeof state.journalEntryCId === 'string',
        'markdown journal entry should record remId'
      );
      await assertJournalReadback(
        ctx,
        state.journalEntryCId as string,
        [expectedEntry, 'Section', 'Item 1'],
        'markdown journal entry'
      );
      steps.push({
        label: 'Append with markdown',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Append with markdown',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  return { name: 'Journal', steps, skipped: false };
}
