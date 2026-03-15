/**
 * Workflow 06: Error Cases
 *
 * Validates that the CLI handles invalid inputs gracefully:
 * nonexistent IDs, missing args, empty queries.
 */

import { assertTruthy, assertContains } from '../assertions.js';
import type { WorkflowContext, WorkflowResult, SharedState, StepResult } from '../types.js';

export async function errorCasesWorkflow(
  ctx: WorkflowContext,
  _state: SharedState
): Promise<WorkflowResult> {
  const steps: StepResult[] = [];

  // Step 1: Create rejects with neither title nor content (bridge-side validation)
  {
    const start = Date.now();
    try {
      // Current contract requires either title or content
      const result = await ctx.cli.runExpectError(['create']);
      assertTruthy(result.exitCode !== 0, 'should have non-zero exit code');
      steps.push({
        label: 'Create rejects with neither title nor content',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Create rejects with neither title nor content',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 2: Read nonexistent note returns error
  {
    const start = Date.now();
    try {
      const result = await ctx.cli.runExpectError(['read', 'nonexistent-id-00000']);
      assertTruthy(result.exitCode !== 0, 'should have non-zero exit code');
      steps.push({
        label: 'Read nonexistent note returns error',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Read nonexistent note returns error',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 3: Update nonexistent note returns error
  {
    const start = Date.now();
    try {
      const result = await ctx.cli.runExpectError([
        'update',
        'nonexistent-id-00000',
        '--title',
        'Nope',
      ]);
      assertTruthy(result.exitCode !== 0, 'should have non-zero exit code');
      steps.push({
        label: 'Update nonexistent note returns error',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Update nonexistent note returns error',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 4: Search with empty query handled gracefully
  {
    const start = Date.now();
    try {
      // Empty query might return empty results or an error — both are acceptable
      const result = await ctx.cli.run(['search', '']);
      // Either success with empty results or an error — both OK
      assertTruthy(result.exitCode === 0 || result.exitCode === 1, 'should exit with 0 or 1');
      steps.push({
        label: 'Search with empty query handled gracefully',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Search with empty query handled gracefully',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 5: Update rejects append + replace conflict
  {
    const start = Date.now();
    try {
      const result = await ctx.cli.runExpectError([
        'update',
        'conflict-id-00000',
        '--append',
        'Append body',
        '--replace',
        'Replace body',
      ]);
      assertTruthy(result.exitCode !== 0, 'should have non-zero exit code');
      assertContains(
        result.stderr,
        'Cannot combine append and replace content options',
        'stderr should explain append/replace conflict'
      );
      steps.push({
        label: 'Update append/replace conflict returns error',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Update append/replace conflict returns error',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 6: Create detects argument shifting in options
  {
    const start = Date.now();
    try {
      // Missing value for --title causes it to swallow --content
      const result = await ctx.cli.runExpectError(['create', '--title', '--content', 'Body']);
      assertTruthy(result.exitCode !== 0, 'should have non-zero exit code');
      assertContains(
        result.stderr,
        'looks like a flag but was passed as an option value',
        'stderr should explain option shifting'
      );
      steps.push({
        label: 'Create detects option shifting',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Create detects option shifting',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 7: Update detects argument shifting in options
  {
    const start = Date.now();
    try {
      // Missing value for --title causes it to swallow --append
      const result = await ctx.cli.runExpectError([
        'update',
        'abc123',
        '--title',
        '--append',
        'More text',
      ]);
      assertTruthy(result.exitCode !== 0, 'should have non-zero exit code');
      assertContains(
        result.stderr,
        'looks like a flag but was passed as an option value',
        'stderr should mention option shifting'
      );
      steps.push({
        label: 'Update detects option shifting',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Update detects option shifting',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 8: Journal detects argument shifting in options
  {
    const start = Date.now();
    try {
      // Missing value for --content causes it to swallow --no-timestamp
      const result = await ctx.cli.runExpectError(['journal', '--content', '--no-timestamp']);
      assertTruthy(result.exitCode !== 0, 'should have non-zero exit code');
      assertContains(
        result.stderr,
        'looks like a flag but was passed as an option value',
        'stderr should mention option shifting'
      );
      steps.push({
        label: 'Journal detects option shifting',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Journal detects option shifting',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  return { name: 'Error Cases', steps, skipped: false };
}
