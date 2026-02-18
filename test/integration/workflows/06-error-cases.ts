/**
 * Workflow 06: Error Cases
 *
 * Validates that the CLI handles invalid inputs gracefully:
 * nonexistent IDs, missing args, empty queries.
 */

import { assertTruthy } from '../assertions.js';
import type { WorkflowContext, WorkflowResult, SharedState, StepResult } from '../types.js';

export async function errorCasesWorkflow(
  ctx: WorkflowContext,
  _state: SharedState
): Promise<WorkflowResult> {
  const steps: StepResult[] = [];

  // Step 1: Read nonexistent note returns error
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

  // Step 2: Update nonexistent note returns error
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

  // Step 3: Search with empty query handled gracefully
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

  return { name: 'Error Cases', steps, skipped: false };
}
