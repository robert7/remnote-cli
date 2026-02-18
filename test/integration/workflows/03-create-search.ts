/**
 * Workflow 03: Create & Search
 *
 * Creates notes via CLI, waits for indexing, then searches for them.
 * Stores note IDs in shared state for downstream workflows.
 */

import { assertHasField, assertTruthy, assertIsArray } from '../assertions.js';
import type { WorkflowContext, WorkflowResult, SharedState, StepResult } from '../types.js';

const INDEXING_DELAY_MS = parseInt(process.env.CLI_TEST_DELAY ?? '2000', 10);

export async function createSearchWorkflow(
  ctx: WorkflowContext,
  state: SharedState
): Promise<WorkflowResult> {
  const steps: StepResult[] = [];

  // Step 1: Create simple note
  {
    const start = Date.now();
    try {
      const result = (await ctx.cli.runExpectSuccess([
        'create',
        `[CLI-TEST] Simple Note ${ctx.runId}`,
      ])) as Record<string, unknown>;
      assertHasField(result, 'remId', 'create simple note');
      state.noteAId = result.remId as string;
      steps.push({ label: 'Create simple note', passed: true, durationMs: Date.now() - start });
    } catch (e) {
      steps.push({
        label: 'Create simple note',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 2: Create rich note (with content and tags)
  {
    const start = Date.now();
    try {
      const result = (await ctx.cli.runExpectSuccess([
        'create',
        `[CLI-TEST] Rich Note ${ctx.runId}`,
        '--content',
        'This is test content',
        '--tags',
        'test-tag-a',
        'test-tag-b',
      ])) as Record<string, unknown>;
      assertHasField(result, 'remId', 'create rich note');
      state.noteBId = result.remId as string;
      steps.push({ label: 'Create rich note', passed: true, durationMs: Date.now() - start });
    } catch (e) {
      steps.push({
        label: 'Create rich note',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Wait for indexing
  await new Promise((r) => setTimeout(r, INDEXING_DELAY_MS));

  // Step 3: Search for created notes
  {
    const start = Date.now();
    try {
      const result = (await ctx.cli.runExpectSuccess([
        'search',
        `[CLI-TEST] ${ctx.runId}`,
      ])) as Record<string, unknown>;
      assertHasField(result, 'results', 'search results');
      assertIsArray(result.results, 'search results');
      const results = result.results as Array<Record<string, unknown>>;
      assertTruthy(results.length >= 2, 'should find at least 2 notes');
      steps.push({
        label: 'Search finds created notes',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Search finds created notes',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 4: Search with includeContent
  {
    const start = Date.now();
    try {
      const result = (await ctx.cli.runExpectSuccess([
        'search',
        `[CLI-TEST] Rich Note ${ctx.runId}`,
        '--include-content',
      ])) as Record<string, unknown>;
      assertHasField(result, 'results', 'search with content');
      const results = result.results as Array<Record<string, unknown>>;
      assertTruthy(results.length >= 1, 'should find rich note');
      steps.push({
        label: 'Search with includeContent',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Search with includeContent',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  return { name: 'Create & Search', steps, skipped: false };
}
