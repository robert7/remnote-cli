/**
 * Workflow 03: Create & Search
 *
 * Creates notes via CLI, waits for indexing, then searches for them.
 * Stores note IDs in shared state for downstream workflows.
 */

import { assertHasField, assertTruthy, assertIsArray, assertEqual } from '../assertions.js';
import type { WorkflowContext, WorkflowResult, SharedState, StepResult } from '../types.js';

const INDEXING_DELAY_MS = parseInt(process.env.CLI_TEST_DELAY ?? '2000', 10);

function summarizeSearchResults(
  results: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return results.slice(0, 8).map((r) => ({
    remId: r.remId,
    title: r.title,
    headline: r.headline,
    hasContent: 'content' in r,
    hasContentStructured: 'contentStructured' in r,
  }));
}

function findMatchingSearchResult(
  results: Array<Record<string, unknown>>,
  remId: string
): Record<string, unknown> {
  const match = results.find((r) => r.remId === remId);
  assertTruthy(match, 'should find matching rich note result');
  return match as Record<string, unknown>;
}

function assertParentContext(
  note: Record<string, unknown>,
  state: SharedState,
  label: string
): void {
  assertTruthy(typeof state.integrationParentRemId === 'string', `${label}: parent remId in state`);
  assertTruthy(typeof state.integrationParentTitle === 'string', `${label}: parent title in state`);
  assertEqual(
    note.parentRemId as string,
    state.integrationParentRemId as string,
    `${label}: parentRemId`
  );
  assertEqual(
    note.parentTitle as string,
    state.integrationParentTitle as string,
    `${label}: parentTitle`
  );
}

function assertSearchContentModeShape(
  note: Record<string, unknown>,
  mode: 'markdown' | 'structured' | 'none'
): void {
  if (mode === 'markdown') {
    assertTruthy(typeof note.content === 'string', 'markdown mode should include string content');
    assertTruthy((note.content as string).length > 0, 'markdown content should be non-empty');
    assertTruthy(!('contentStructured' in note), 'markdown mode should omit contentStructured');
    return;
  }

  if (mode === 'structured') {
    assertIsArray(note.contentStructured, 'structured mode contentStructured');
    assertTruthy(
      Array.isArray(note.contentStructured) && note.contentStructured.length > 0,
      'structured mode should include non-empty contentStructured'
    );
    assertTruthy(!('content' in note), 'structured mode should omit markdown content');
    return;
  }

  assertTruthy(!('content' in note), 'none mode should omit markdown content');
  assertTruthy(!('contentStructured' in note), 'none mode should omit structured content');
}

export async function createSearchWorkflow(
  ctx: WorkflowContext,
  state: SharedState
): Promise<WorkflowResult> {
  const steps: StepResult[] = [];

  if (!state.integrationParentRemId) {
    return {
      name: 'Create & Search',
      steps: [
        {
          label: 'Skipped — integration parent note not initialized',
          passed: false,
          durationMs: 0,
          error: 'No integrationParentRemId in shared state',
        },
      ],
      skipped: true,
    };
  }

  // Step 1: Create simple note
  {
    const start = Date.now();
    try {
      const result = (await ctx.cli.runExpectSuccess([
        'create',
        `[CLI-TEST] Simple Note ${ctx.runId}`,
        '--parent-id',
        state.integrationParentRemId,
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
        '--parent-id',
        state.integrationParentRemId,
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
      assertTruthy(typeof state.noteAId === 'string', 'simple note remId should be recorded');
      const simpleMatch = findMatchingSearchResult(results, state.noteAId as string);
      assertParentContext(simpleMatch, state, 'search simple note parent context');
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

  // Step 4-6: Search with includeContent modes
  for (const mode of ['markdown', 'structured', 'none'] as const) {
    const start = Date.now();
    const label = `Search includeContent=${mode} returns expected shape`;
    const query = `[CLI-TEST] ${ctx.runId}`;
    let debugResults: Array<Record<string, unknown>> | null = null;
    try {
      const result = (await ctx.cli.runExpectSuccess([
        'search',
        query,
        '--include-content',
        mode,
      ])) as Record<string, unknown>;
      assertHasField(result, 'results', `search ${mode}`);
      assertIsArray(result.results, `search ${mode} results`);
      const results = result.results as Array<Record<string, unknown>>;
      debugResults = results;
      assertTruthy(results.length >= 1, `search ${mode} should find rich note`);
      assertTruthy(typeof state.noteBId === 'string', 'rich note remId should be recorded');
      const match = findMatchingSearchResult(results, state.noteBId as string);
      assertSearchContentModeShape(match, mode);
      assertParentContext(match, state, `search ${mode} parent context`);
      steps.push({
        label,
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label,
        passed: false,
        durationMs: Date.now() - start,
        error:
          `${(e as Error).message} | query=${JSON.stringify(query)} expectedRemId=${JSON.stringify(
            state.noteBId ?? null
          )}` +
          (debugResults
            ? ` resultCount=${debugResults.length} topResults=${JSON.stringify(
                summarizeSearchResults(debugResults)
              )}`
            : ''),
      });
    }
  }

  return { name: 'Create & Search', steps, skipped: false };
}
