/**
 * Workflow 05: Journal
 *
 * Appends entries to today's daily document via the CLI.
 */

import { assertHasField } from '../assertions.js';
import type { WorkflowContext, WorkflowResult, SharedState, StepResult } from '../types.js';

export async function journalWorkflow(
  ctx: WorkflowContext,
  _state: SharedState
): Promise<WorkflowResult> {
  const steps: StepResult[] = [];

  // Step 1: Append with timestamp
  {
    const start = Date.now();
    try {
      const result = (await ctx.cli.runExpectSuccess([
        'journal',
        `[CLI-TEST] Journal entry with timestamp ${ctx.runId}`,
      ])) as Record<string, unknown>;
      assertHasField(result, 'remId', 'journal append with timestamp');
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
      const result = (await ctx.cli.runExpectSuccess([
        'journal',
        `[CLI-TEST] No-timestamp entry ${ctx.runId}`,
        '--no-timestamp',
      ])) as Record<string, unknown>;
      assertHasField(result, 'remId', 'journal append without timestamp');
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

  return { name: 'Journal', steps, skipped: false };
}
