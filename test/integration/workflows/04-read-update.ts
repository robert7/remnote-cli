/**
 * Workflow 04: Read & Update
 *
 * Reads notes created in workflow 03, updates them, re-reads to verify.
 * Skipped if workflow 03 failed or note IDs are missing.
 */

import { assertHasField, assertTruthy } from '../assertions.js';
import type { WorkflowContext, WorkflowResult, SharedState, StepResult } from '../types.js';

function summarizeReadResult(result: Record<string, unknown>): Record<string, unknown> {
  return {
    remId: result.remId,
    title: result.title,
    keys: Object.keys(result),
    hasContent: 'content' in result,
    hasContentProperties: 'contentProperties' in result,
    contentLength: typeof result.content === 'string' ? result.content.length : undefined,
    contentProperties: result.contentProperties,
  };
}

export async function readUpdateWorkflow(
  ctx: WorkflowContext,
  state: SharedState
): Promise<WorkflowResult> {
  const steps: StepResult[] = [];

  if (!state.noteAId || !state.noteBId) {
    return {
      name: 'Read & Update',
      steps: [
        {
          label: 'Skipped — missing note IDs from Create & Search',
          passed: false,
          durationMs: 0,
          error: 'Prerequisites not met',
        },
      ],
      skipped: true,
    };
  }

  // Step 1: Read note A
  {
    const start = Date.now();
    try {
      const result = (await ctx.cli.runExpectSuccess(['read', state.noteAId])) as Record<
        string,
        unknown
      >;
      assertHasField(result, 'title', 'read note A title');
      assertTruthy(
        (result.title as string).includes('[CLI-TEST]'),
        'title should contain test prefix'
      );
      steps.push({ label: 'Read note A', passed: true, durationMs: Date.now() - start });
    } catch (e) {
      steps.push({
        label: 'Read note A',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 2-3: Read note B includeContent modes
  for (const mode of ['markdown', 'none'] as const) {
    const start = Date.now();
    const label = `Read note B includeContent=${mode} returns expected shape`;
    let debugResult: Record<string, unknown> | null = null;
    try {
      const result = (await ctx.cli.runExpectSuccess([
        'read',
        state.noteBId,
        '--include-content',
        mode,
      ])) as Record<string, unknown>;
      debugResult = result;
      assertHasField(result, 'title', 'read note B title');
      assertHasField(result, 'remId', 'read note B remId');
      if (mode === 'markdown') {
        assertHasField(result, 'content', 'read note B markdown');
        assertTruthy(typeof result.content === 'string', 'content should be string');
        assertTruthy((result.content as string).length > 0, 'markdown content should be non-empty');
        assertHasField(result, 'contentProperties', 'read note B contentProperties');
      } else {
        assertTruthy(!('content' in result), 'none mode should omit content');
        assertTruthy(!('contentProperties' in result), 'none mode should omit contentProperties');
      }
      steps.push({ label, passed: true, durationMs: Date.now() - start });
    } catch (e) {
      steps.push({
        label,
        passed: false,
        durationMs: Date.now() - start,
        error:
          `${(e as Error).message} | remId=${JSON.stringify(state.noteBId)} mode=${mode}` +
          (debugResult ? ` result=${JSON.stringify(summarizeReadResult(debugResult))}` : ''),
      });
    }
  }

  // Step 3: Update note A — append content
  {
    const start = Date.now();
    try {
      const result = (await ctx.cli.runExpectSuccess([
        'update',
        state.noteAId,
        '--append',
        'Appended by CLI integration test',
      ])) as Record<string, unknown>;
      assertHasField(result, 'remId', 'update note A');
      steps.push({ label: 'Update note A (append)', passed: true, durationMs: Date.now() - start });
    } catch (e) {
      steps.push({
        label: 'Update note A (append)',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 4: Update note B — add tags
  {
    const start = Date.now();
    try {
      const result = (await ctx.cli.runExpectSuccess([
        'update',
        state.noteBId,
        '--add-tags',
        'cli-test-added',
      ])) as Record<string, unknown>;
      assertHasField(result, 'remId', 'update note B add tags');
      steps.push({
        label: 'Update note B (add tags)',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Update note B (add tags)',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 5: Re-read note A to verify update
  {
    const start = Date.now();
    try {
      const result = (await ctx.cli.runExpectSuccess(['read', state.noteAId])) as Record<
        string,
        unknown
      >;
      assertHasField(result, 'title', 're-read note A');
      steps.push({
        label: 'Re-read note A (verify update)',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Re-read note A (verify update)',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  return { name: 'Read & Update', steps, skipped: false };
}
