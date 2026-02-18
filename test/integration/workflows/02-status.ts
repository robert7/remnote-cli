/**
 * Workflow 02: Status Check (gatekeeper)
 *
 * Verifies the CLI can communicate with RemNote via the bridge.
 * If this fails, remaining workflows are skipped.
 *
 * Prerequisites: Daemon must be running AND RemNote bridge must be connected.
 */

import { assertHasField, assertTruthy } from '../assertions.js';
import type { WorkflowContext, WorkflowResult, SharedState, StepResult } from '../types.js';

export async function statusWorkflow(
  ctx: WorkflowContext,
  _state: SharedState
): Promise<WorkflowResult> {
  const steps: StepResult[] = [];

  // Step 1: Check bridge connection status
  {
    const start = Date.now();
    try {
      const result = await ctx.cli.runExpectSuccess(['status']);
      const r = result as Record<string, unknown>;
      assertHasField(r, 'connected', 'status result');
      assertTruthy(r.connected, 'bridge should be connected');
      steps.push({ label: 'Bridge connected', passed: true, durationMs: Date.now() - start });
    } catch (e) {
      steps.push({
        label: 'Bridge connected',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 2: Verify plugin version is reported
  {
    const start = Date.now();
    try {
      const result = await ctx.cli.runExpectSuccess(['status']);
      const r = result as Record<string, unknown>;
      assertHasField(r, 'pluginVersion', 'status result pluginVersion');
      assertTruthy(typeof r.pluginVersion === 'string', 'pluginVersion should be a string');
      steps.push({
        label: 'Plugin version reported',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Plugin version reported',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  return { name: 'Status Check', steps, skipped: false };
}
