/**
 * Workflow 04: Read & Update
 *
 * Reads notes created in workflow 03, updates them, re-reads to verify.
 * Skipped if workflow 03 failed or note IDs are missing.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertHasField, assertTruthy, assertEqual, assertContains } from '../assertions.js';
import type { WorkflowContext, WorkflowResult, SharedState, StepResult } from '../types.js';

function summarizeReadResult(result: Record<string, unknown>): Record<string, unknown> {
  return {
    remId: result.remId,
    title: result.title,
    keys: Object.keys(result),
    hasContent: 'content' in result,
    hasContentStructured: 'contentStructured' in result,
    hasContentProperties: 'contentProperties' in result,
    contentLength: typeof result.content === 'string' ? result.content.length : undefined,
    contentProperties: result.contentProperties,
  };
}

async function resolveExpectedSearchByTagTarget(
  ctx: WorkflowContext,
  taggedRemId: string
): Promise<string> {
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
  let nearestNonDocumentAncestorId: string | undefined;

  while (currentParentId) {
    const parent = (await ctx.cli.runExpectSuccess([
      'read',
      currentParentId,
      '--include-content',
      'none',
    ])) as Record<string, unknown>;

    const parentRemId = parent.remId as string;
    const parentRemType = parent.remType as string;
    if (!nearestNonDocumentAncestorId) {
      nearestNonDocumentAncestorId = parentRemId;
    }

    if (parentRemType === 'document' || parentRemType === 'dailyDocument') {
      return parentRemId;
    }

    currentParentId =
      typeof parent.parentRemId === 'string' && parent.parentRemId.length > 0
        ? (parent.parentRemId as string)
        : undefined;
  }

  return nearestNonDocumentAncestorId ?? (tagged.remId as string);
}

async function withTempContentFile<T>(
  content: string,
  fn: (path: string) => Promise<T>
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'remnote-cli-it-update-'));
  const path = join(dir, 'append.md');
  try {
    await writeFile(path, content, 'utf8');
    return await fn(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function readUpdateWorkflow(
  ctx: WorkflowContext,
  state: SharedState
): Promise<WorkflowResult> {
  const steps: StepResult[] = [];
  const acceptWriteOperations = state.acceptWriteOperations ?? true;
  const acceptReplaceOperation = acceptWriteOperations && (state.acceptReplaceOperation ?? false);
  const tagVerificationName = `cli-test-added-${ctx.runId.replace(/[^a-zA-Z0-9]/g, '-')}`;

  function assertTagsInclude(
    note: Record<string, unknown>,
    expectedTag: string,
    label: string
  ): void {
    assertHasField(note, 'tags', `${label}: tags`);
    assertTruthy(Array.isArray(note.tags), `${label}: tags should be an array`);
    assertTruthy(
      (note.tags as unknown[]).includes(expectedTag),
      `${label}: tags should include ${expectedTag}`
    );
  }

  function assertTagsExclude(
    note: Record<string, unknown>,
    excludedTag: string,
    label: string
  ): void {
    assertHasField(note, 'tags', `${label}: tags`);
    assertTruthy(Array.isArray(note.tags), `${label}: tags should be an array`);
    assertTruthy(
      !(note.tags as unknown[]).includes(excludedTag),
      `${label}: tags should not include ${excludedTag}`
    );
  }

  if (
    !state.noteAId ||
    !state.noteBId ||
    !state.integrationParentRemId ||
    !state.integrationParentTitle
  ) {
    return {
      name: 'Read & Update',
      steps: [
        {
          label: 'Skipped — missing note IDs or integration parent from Create & Search/setup',
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
      assertHasField(result, 'parentRemId', 'read note A parentRemId');
      assertHasField(result, 'parentTitle', 'read note A parentTitle');
      assertEqual(
        result.parentRemId as string,
        state.integrationParentRemId as string,
        'read note A parentRemId should match integration parent'
      );
      assertEqual(
        result.parentTitle as string,
        state.integrationParentTitle as string,
        'read note A parentTitle should match integration parent'
      );
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

  // Step 2-4: Read note B includeContent modes
  for (const mode of ['markdown', 'structured', 'none'] as const) {
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
      assertHasField(result, 'parentRemId', 'read note B parentRemId');
      assertHasField(result, 'parentTitle', 'read note B parentTitle');
      assertEqual(
        result.parentRemId as string,
        state.integrationParentRemId as string,
        'read note B parentRemId should match integration parent'
      );
      assertEqual(
        result.parentTitle as string,
        state.integrationParentTitle as string,
        'read note B parentTitle should match integration parent'
      );
      assertTruthy(
        typeof state.searchByTagTag === 'string',
        'initial search tag should be recorded'
      );
      assertTagsInclude(result, state.searchByTagTag as string, `read ${mode}`);
      if (mode === 'markdown') {
        assertHasField(result, 'content', 'read note B markdown');
        assertTruthy(typeof result.content === 'string', 'content should be string');
        assertTruthy((result.content as string).length > 0, 'markdown content should be non-empty');
        assertHasField(result, 'contentProperties', 'read note B contentProperties');
      } else if (mode === 'structured') {
        assertHasField(result, 'contentStructured', 'read note B structured content');
        assertTruthy(
          Array.isArray(result.contentStructured),
          'structured mode contentStructured should be an array'
        );
        assertTruthy(
          Array.isArray(result.contentStructured) && result.contentStructured.length > 0,
          'structured mode contentStructured should be non-empty'
        );
        assertTruthy(!('content' in result), 'structured mode should omit markdown content');
        assertTruthy(
          !('contentProperties' in result),
          'structured mode should omit contentProperties'
        );
      } else {
        assertTruthy(!('content' in result), 'none mode should omit content');
        assertTruthy(!('contentStructured' in result), 'none mode should omit structured content');
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

  // Step 3: Update note A — append content (or validate write gate rejection)
  {
    const start = Date.now();
    try {
      if (acceptWriteOperations) {
        const result = (await withTempContentFile(
          'Appended by CLI integration test',
          async (contentPath) =>
            (await ctx.cli.runExpectSuccess([
              'update',
              state.noteAId as string,
              '--append-file',
              contentPath,
            ])) as Record<string, unknown>
        )) as Record<string, unknown>;
        assertHasField(result, 'remIds', 'update note A');
        steps.push({
          label: 'Update note A (append)',
          passed: true,
          durationMs: Date.now() - start,
        });
      } else {
        const result = await ctx.cli.runExpectError([
          'update',
          state.noteAId as string,
          '--append',
          'Should be blocked',
        ]);
        assertContains(
          result.stderr,
          'Write operations are disabled by bridge settings',
          'append should be blocked when write operations are disabled'
        );
        steps.push({
          label: 'Update note A (append) blocked by write gate',
          passed: true,
          durationMs: Date.now() - start,
        });
      }
    } catch (e) {
      steps.push({
        label: acceptWriteOperations
          ? 'Update note A (append)'
          : 'Update note A (append) blocked by write gate',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 4: Update note B — add tags (or validate write gate rejection)
  {
    const start = Date.now();
    try {
      if (acceptWriteOperations) {
        const expectedTargetRemId = await resolveExpectedSearchByTagTarget(
          ctx,
          state.noteBId as string
        );
        const result = (await ctx.cli.runExpectSuccess([
          'update',
          state.noteBId as string,
          '--add-tags',
          tagVerificationName,
        ])) as Record<string, unknown>;
        assertHasField(result, 'remIds', 'update note B add tags');
        const taggedSearch = (await ctx.cli.runExpectSuccess([
          'search-tag',
          tagVerificationName,
          '--include-content',
          'none',
          '--limit',
          '10',
        ])) as Record<string, unknown>;
        assertHasField(taggedSearch, 'results', 'search-tag after add tags');
        assertTruthy(
          Array.isArray(taggedSearch.results),
          'search-tag after add tags should return results'
        );
        const taggedResults = taggedSearch.results as Array<Record<string, unknown>>;
        const match = taggedResults.find((r) => r.remId === expectedTargetRemId);
        assertTruthy(match, 'added tag should resolve to the tagged target');
        const taggedRead = (await ctx.cli.runExpectSuccess([
          'read',
          state.noteBId as string,
          '--include-content',
          'none',
        ])) as Record<string, unknown>;
        assertTagsInclude(taggedRead, tagVerificationName, 'read after add tags');
        steps.push({
          label: 'Update note B (add tags)',
          passed: true,
          durationMs: Date.now() - start,
        });
      } else {
        const result = await ctx.cli.runExpectError([
          'update',
          state.noteBId as string,
          '--add-tags',
          tagVerificationName,
        ]);
        assertContains(
          result.stderr,
          'Write operations are disabled by bridge settings',
          'add tags should be blocked when write operations are disabled'
        );
        steps.push({
          label: 'Update note B (add tags) blocked by write gate',
          passed: true,
          durationMs: Date.now() - start,
        });
      }
    } catch (e) {
      steps.push({
        label: acceptWriteOperations
          ? 'Update note B (add tags)'
          : 'Update note B (add tags) blocked by write gate',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 4b: Update note B — remove tags (or validate write gate rejection)
  {
    const start = Date.now();
    try {
      if (acceptWriteOperations) {
        const expectedTargetRemId = await resolveExpectedSearchByTagTarget(
          ctx,
          state.noteBId as string
        );
        const result = (await ctx.cli.runExpectSuccess([
          'update',
          state.noteBId as string,
          '--remove-tags',
          tagVerificationName,
        ])) as Record<string, unknown>;
        assertHasField(result, 'remIds', 'update note B remove tags');
        const taggedSearch = (await ctx.cli.runExpectSuccess([
          'search-tag',
          tagVerificationName,
          '--include-content',
          'none',
          '--limit',
          '10',
        ])) as Record<string, unknown>;
        assertHasField(taggedSearch, 'results', 'search-tag after remove tags');
        assertTruthy(
          Array.isArray(taggedSearch.results),
          'search-tag after remove tags should return results array'
        );
        const taggedResults = taggedSearch.results as Array<Record<string, unknown>>;
        const match = taggedResults.find((r) => r.remId === expectedTargetRemId);
        assertTruthy(!match, 'removed tag should no longer resolve to the tagged target');
        const taggedRead = (await ctx.cli.runExpectSuccess([
          'read',
          state.noteBId as string,
          '--include-content',
          'none',
        ])) as Record<string, unknown>;
        assertTagsExclude(taggedRead, tagVerificationName, 'read after remove tags');
        steps.push({
          label: 'Update note B (remove tags)',
          passed: true,
          durationMs: Date.now() - start,
        });
      } else {
        const result = await ctx.cli.runExpectError([
          'update',
          state.noteBId as string,
          '--remove-tags',
          tagVerificationName,
        ]);
        assertContains(
          result.stderr,
          'Write operations are disabled by bridge settings',
          'remove tags should be blocked when write operations are disabled'
        );
        steps.push({
          label: 'Update note B (remove tags) blocked by write gate',
          passed: true,
          durationMs: Date.now() - start,
        });
      }
    } catch (e) {
      steps.push({
        label: acceptWriteOperations
          ? 'Update note B (remove tags)'
          : 'Update note B (remove tags) blocked by write gate',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 5: Replace note A content (or validate gate rejection)
  {
    const start = Date.now();
    try {
      if (acceptReplaceOperation) {
        const replaceBody = `[CLI-TEST] Replaced via integration test ${ctx.runId}`;
        const result = (await withTempContentFile(
          replaceBody,
          async (contentPath) =>
            (await ctx.cli.runExpectSuccess([
              'update',
              state.noteAId as string,
              '--replace-file',
              contentPath,
            ])) as Record<string, unknown>
        )) as Record<string, unknown>;
        assertHasField(result, 'remIds', 'replace note A');

        const reread = (await ctx.cli.runExpectSuccess([
          'read',
          state.noteAId as string,
          '--include-content',
          'markdown',
        ])) as Record<string, unknown>;
        assertTruthy(typeof reread.content === 'string', 're-read content should be a string');
        assertContains(
          reread.content as string,
          replaceBody,
          're-read content should include replaced body'
        );
        steps.push({
          label: 'Update note A (replace)',
          passed: true,
          durationMs: Date.now() - start,
        });
      } else if (acceptWriteOperations) {
        const result = await ctx.cli.runExpectError([
          'update',
          state.noteAId as string,
          '--replace',
          'Should be blocked',
        ]);
        assertContains(
          result.stderr,
          'Replace operation is disabled',
          'replace should be blocked when replace gate is disabled'
        );
        steps.push({
          label: 'Update note A (replace) blocked by replace gate',
          passed: true,
          durationMs: Date.now() - start,
        });
      } else {
        const result = await ctx.cli.runExpectError([
          'update',
          state.noteAId as string,
          '--replace',
          'Should be blocked',
        ]);
        assertContains(
          result.stderr,
          'Write operations are disabled by bridge settings',
          'replace should be blocked when write operations are disabled'
        );
        steps.push({
          label: 'Update note A (replace) blocked by write gate',
          passed: true,
          durationMs: Date.now() - start,
        });
      }
    } catch (e) {
      steps.push({
        label: acceptReplaceOperation
          ? 'Update note A (replace)'
          : acceptWriteOperations
            ? 'Update note A (replace) blocked by replace gate'
            : 'Update note A (replace) blocked by write gate',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 6: Empty replace clears direct children (when replace is enabled)
  if (acceptReplaceOperation) {
    const start = Date.now();
    try {
      const result = (await ctx.cli.runExpectSuccess([
        'update',
        state.noteAId as string,
        '--replace',
        '',
      ])) as Record<string, unknown>;
      assertHasField(result, 'remIds', 'empty replace note A');

      const reread = (await ctx.cli.runExpectSuccess([
        'read',
        state.noteAId as string,
        '--include-content',
        'markdown',
      ])) as Record<string, unknown>;
      assertEqual(
        (reread.content as string | undefined) ?? '',
        '',
        'empty replace should clear markdown content'
      );
      steps.push({
        label: 'Update note A (empty replace clears children)',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Update note A (empty replace clears children)',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 7: Re-read note A to verify update
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

  // Step 8: Update note A with a markdown tree
  if (acceptWriteOperations) {
    const start = Date.now();
    try {
      const markdownTree = `[CLI-TEST] Markdown Tree ${ctx.runId}\n- Branch 1\n  - Leaf 1\n- Branch 2`;
      const result = (await withTempContentFile(
        markdownTree,
        async (contentPath) =>
          (await ctx.cli.runExpectSuccess([
            'update',
            state.noteAId as string,
            '--append-file',
            contentPath,
          ])) as Record<string, unknown>
      )) as Record<string, unknown>;
      assertHasField(result, 'remIds', 'update note A markdown tree');
      // Should create multiple Rems (root + branches + leaf)
      assertTruthy((result.remIds as string[]).length >= 4, 'should create multiple rems for tree');

      steps.push({
        label: 'Update note A (append markdown tree)',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Update note A (append markdown tree)',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 9: Replace note A with another markdown tree
  if (acceptReplaceOperation) {
    const start = Date.now();
    try {
      const markdownTree = `[CLI-TEST] Replaced Tree ${ctx.runId}\n- New Branch\n  - New Leaf`;
      const result = (await withTempContentFile(
        markdownTree,
        async (contentPath) =>
          (await ctx.cli.runExpectSuccess([
            'update',
            state.noteAId as string,
            '--replace-file',
            contentPath,
          ])) as Record<string, unknown>
      )) as Record<string, unknown>;
      assertHasField(result, 'remIds', 'update note A replace markdown tree');
      assertTruthy(
        (result.remIds as string[]).length >= 3,
        'should create multiple rems for replaced tree'
      );

      const reread = (await ctx.cli.runExpectSuccess([
        'read',
        state.noteAId as string,
        '--include-content',
        'markdown',
      ])) as Record<string, unknown>;
      assertContains(
        reread.content as string,
        'New Branch',
        'should contain replaced tree content'
      );
      assertContains(reread.content as string, 'New Leaf', 'should contain replaced tree content');

      steps.push({
        label: 'Update note A (replace markdown tree)',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Update note A (replace markdown tree)',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  return { name: 'Read & Update', steps, skipped: false };
}
