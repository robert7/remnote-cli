/**
 * Workflow 03: Create & Search
 *
 * Creates notes via CLI, waits for indexing, then searches for them.
 * Stores note IDs in shared state for downstream workflows.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertHasField, assertTruthy, assertIsArray, assertEqual } from '../assertions.js';
import type { WorkflowContext, WorkflowResult, SharedState, StepResult } from '../types.js';

const INDEXING_DELAY_MS = parseInt(process.env.CLI_TEST_DELAY ?? '2000', 10);

async function withTempContentFile<T>(
  content: string,
  fn: (path: string) => Promise<T>
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'remnote-cli-it-create-'));
  const path = join(dir, 'content.md');
  try {
    await writeFile(path, content, 'utf8');
    return await fn(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

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

function assertTagNamesInclude(
  note: Record<string, unknown>,
  expectedTagNames: string[],
  label: string
): void {
  assertIsArray(note.tags, `${label}: tags should be an array`);
  const tags = note.tags as string[];
  for (const expectedTagName of expectedTagNames) {
    assertTruthy(
      tags.includes(expectedTagName),
      `${label}: tags should include ${expectedTagName}`
    );
  }
}

interface ExpectedTagTarget {
  remId: string;
  remType: string;
  source: 'documentAncestor' | 'nearestNonDocumentAncestor' | 'self';
}

async function resolveExpectedSearchByTagTarget(
  ctx: WorkflowContext,
  taggedRemId: string
): Promise<ExpectedTagTarget> {
  const tagged = (await ctx.cli.runExpectSuccess([
    'read',
    taggedRemId,
    '--include-content',
    'none',
  ])) as Record<string, unknown>;

  let currentParentId =
    typeof tagged.parentRemId === 'string' && tagged.parentRemId.length > 0
      ? (tagged.parentRemId as string)
      : undefined;

  let nearestNonDocumentAncestor: { remId: string; remType: string } | undefined;

  while (currentParentId) {
    const parent = (await ctx.cli.runExpectSuccess([
      'read',
      currentParentId,
      '--include-content',
      'none',
    ])) as Record<string, unknown>;

    const parentRemId = parent.remId as string;
    const parentRemType = parent.remType as string;
    if (!nearestNonDocumentAncestor) {
      nearestNonDocumentAncestor = { remId: parentRemId, remType: parentRemType };
    }

    if (parentRemType === 'document' || parentRemType === 'dailyDocument') {
      return {
        remId: parentRemId,
        remType: parentRemType,
        source: 'documentAncestor',
      };
    }

    currentParentId =
      typeof parent.parentRemId === 'string' && parent.parentRemId.length > 0
        ? (parent.parentRemId as string)
        : undefined;
  }

  if (nearestNonDocumentAncestor) {
    return {
      remId: nearestNonDocumentAncestor.remId,
      remType: nearestNonDocumentAncestor.remType,
      source: 'nearestNonDocumentAncestor',
    };
  }

  return {
    remId: tagged.remId as string,
    remType: tagged.remType as string,
    source: 'self',
  };
}

export async function createSearchWorkflow(
  ctx: WorkflowContext,
  state: SharedState
): Promise<WorkflowResult> {
  const steps: StepResult[] = [];
  const sanitizedRunId = ctx.runId.replace(/[^a-zA-Z0-9]/g, '-');
  const mdTreeRootOnlyTag = `cli-tree-root-${sanitizedRunId}`;

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

  if (!state.searchByTagTag) {
    state.searchByTagTag = `cli-test-tag-${sanitizedRunId}`;
  }

  // Step 1: Create simple note (title-only)
  {
    const start = Date.now();
    try {
      const result = (await ctx.cli.runExpectSuccess([
        'create',
        `[CLI-TEST] Simple Note ${ctx.runId}`,
        '--parent-id',
        state.integrationParentRemId,
      ])) as Record<string, unknown>;
      assertHasField(result, 'remIds', 'create simple note');
      assertIsArray(result.remIds, 'remIds should be an array');
      state.noteAId = (result.remIds as string[])[0];
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

  // Step 2: Create rich note (with content-only and tags)
  {
    const start = Date.now();
    try {
      const result = (await withTempContentFile('This is test content', async (contentPath) => {
        return (await ctx.cli.runExpectSuccess([
          'create',
          `[CLI-TEST] Rich Note ${ctx.runId}`,
          '--parent-id',
          state.integrationParentRemId,
          '--content-file',
          contentPath,
          '--tags',
          state.searchByTagTag,
        ])) as Record<string, unknown>;
      })) as Record<string, unknown>;
      assertHasField(result, 'remIds', 'create rich note');
      assertIsArray(result.remIds, 'remIds should be an array');
      state.noteBId = (result.remIds as string[])[0];
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

  // Step 3: Create flashcard note with positional arguments
  {
    const start = Date.now();
    try {
      const result = (await ctx.cli.runExpectSuccess([
        'create',
        `[CLI-TEST] Flashcard Note ${ctx.runId}`,
        '--content',
        'Front :: Back',
        '--parent-id',
        state.integrationParentRemId as string,
        '--tags',
        state.searchByTagTag as string,
      ])) as Record<string, unknown>;
      assertHasField(result, 'remIds', 'create flashcard note');
      assertIsArray(result.remIds, 'remIds should be an array');
      state.noteCId = (result.remIds as string[])[0];

      steps.push({
        label: 'Create flashcard with positional arguments checks',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Create flashcard with positional arguments checks',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 4: Create markdown tree with various flashcard types
  {
    const start = Date.now();
    try {
      const markdownContent = [
        `- Flashcard Tree`,
        `  - Basic Forward >> Answer`,
        `  - Basic Backward << Answer`,
        `  - Two-way :: Answer`,
        `  - Disabled >- Answer`,
        `  - Cloze with {{hidden}}{({hint text})} text`,
        `  - Concept :: Definition`,
        `  - Concept Forward :> Definition`,
        `  - Concept Backward :< Definition`,
        `  - Descriptor ;; Detail`,
        `  - Multi-line >>>`,
        `    - Card Item 1`,
        `    - Card Item 2`,
        `  - List-answer >>1.`,
        `    - First list item`,
        `    - Second list item`,
        `  - Multiple-choice >>A)`,
        `    - Correct option`,
        `    - Wrong option`,
      ].join('\n');

      const result = (await withTempContentFile(markdownContent, async (contentPath) => {
        return (await ctx.cli.runExpectSuccess([
          'create',
          '--parent-id',
          state.integrationParentRemId as string,
          '--content-file',
          contentPath,
          '--title',
          `[CLI-TEST] Flashcard Tree ${ctx.runId}`,
          '--tags',
          state.searchByTagTag as string,
          mdTreeRootOnlyTag,
        ])) as Record<string, unknown>;
      })) as Record<string, unknown>;

      assertHasField(result, 'remIds', 'create markdown tree');
      assertIsArray(result.remIds, 'markdown tree remIds');
      state.mdTreeIds = result.remIds as string[];
      steps.push({
        label: 'Create md tree with flashcards',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Create md tree with flashcards',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Wait for indexing
  await new Promise((r) => setTimeout(r, INDEXING_DELAY_MS));

  // Step 5: Search for created notes
  {
    const start = Date.now();
    try {
      const result = (await ctx.cli.runExpectSuccess(['search', `${ctx.runId}`])) as Record<
        string,
        unknown
      >;
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

  // Step 6-8: Search with includeContent modes
  for (const mode of ['markdown', 'structured', 'none'] as const) {
    const start = Date.now();
    const label = `Search includeContent=${mode} returns expected shape`;
    const query = `${ctx.runId}`;
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
      assertTruthy(
        typeof state.mdTreeIds?.[0] === 'string',
        'md tree root remId should be recorded'
      );
      const match = findMatchingSearchResult(results, state.mdTreeIds?.[0] as string);
      assertSearchContentModeShape(match, mode);
      assertParentContext(match, state, `search ${mode} parent context`);
      assertTagNamesInclude(
        match,
        [state.searchByTagTag as string, mdTreeRootOnlyTag],
        `search ${mode} md tree root tags`
      );
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
            state.mdTreeIds?.[0] ?? null
          )}` +
          (debugResults
            ? ` resultCount=${debugResults.length} topResults=${JSON.stringify(
                summarizeSearchResults(debugResults)
              )}`
            : ''),
      });
    }
  }

  // Step 9: Root-only markdown tree tag does not bleed to descendants
  {
    const start = Date.now();
    let debugResults: Array<Record<string, unknown>> | null = null;
    try {
      assertTruthy(
        typeof state.mdTreeIds?.[0] === 'string',
        'md tree root remId should be recorded'
      );
      const expectedTarget = await resolveExpectedSearchByTagTarget(
        ctx,
        state.mdTreeIds[0] as string
      );
      const result = (await ctx.cli.runExpectSuccess([
        'search-tag',
        mdTreeRootOnlyTag,
        '--include-content',
        'none',
        '--limit',
        '10',
      ])) as Record<string, unknown>;
      assertHasField(result, 'results', 'search-tag markdown tree root-only tag');
      assertIsArray(result.results, 'search-tag markdown tree root-only tag results');
      const results = result.results as Array<Record<string, unknown>>;
      debugResults = results;
      assertEqual(
        results.length,
        1,
        'root-only markdown tree tag should resolve to exactly one target'
      );
      findMatchingSearchResult(results, expectedTarget.remId);
      steps.push({
        label: 'Root-only markdown tree tag excludes descendants',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Root-only markdown tree tag excludes descendants',
        passed: false,
        durationMs: Date.now() - start,
        error:
          `${(e as Error).message} | tag=${JSON.stringify(mdTreeRootOnlyTag)}` +
          (debugResults
            ? ` resultCount=${debugResults.length} topResults=${JSON.stringify(
                summarizeSearchResults(debugResults)
              )}`
            : ''),
      });
    }
  }

  // Step 10-12: Search by tag with includeContent modes
  let expectedTagTarget: ExpectedTagTarget | undefined;
  {
    const start = Date.now();
    try {
      assertTruthy(typeof state.noteBId === 'string', 'rich note remId should be recorded');
      expectedTagTarget = await resolveExpectedSearchByTagTarget(ctx, state.noteBId as string);
      steps.push({
        label: 'Resolve expected search-tag ancestor target',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Resolve expected search-tag ancestor target',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  for (const mode of ['markdown', 'structured', 'none'] as const) {
    const start = Date.now();
    const label = `Search-tag includeContent=${mode} returns expected shape`;
    let debugResults: Array<Record<string, unknown>> | null = null;
    try {
      assertTruthy(typeof state.searchByTagTag === 'string', 'searchByTagTag should be recorded');
      const result = (await ctx.cli.runExpectSuccess([
        'search-tag',
        state.searchByTagTag as string,
        '--include-content',
        mode,
      ])) as Record<string, unknown>;
      assertHasField(result, 'results', `search-tag ${mode}`);
      assertIsArray(result.results, `search-tag ${mode} results`);
      const results = result.results as Array<Record<string, unknown>>;
      debugResults = results;
      assertTruthy(results.length >= 1, `search-tag ${mode} should return results`);
      assertTruthy(expectedTagTarget, 'expected tag target should be resolved');
      const match = findMatchingSearchResult(
        results,
        (expectedTagTarget as ExpectedTagTarget).remId
      );
      assertSearchContentModeShape(match, mode);
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
          `${(e as Error).message} | tag=${JSON.stringify(state.searchByTagTag ?? null)} expectedTarget=${JSON.stringify(expectedTagTarget ?? null)}` +
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
