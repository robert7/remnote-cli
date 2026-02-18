/**
 * Workflow 01: Daemon Lifecycle
 *
 * Tests daemon start, status, and stop commands.
 * This workflow is self-contained — it starts and stops its own daemon.
 */

import { assertEqual, assertHasField, assertTruthy } from '../assertions.js';
import type { WorkflowContext, WorkflowResult, SharedState, StepResult } from '../types.js';

export async function daemonLifecycleWorkflow(
  ctx: WorkflowContext,
  _state: SharedState
): Promise<WorkflowResult> {
  const steps: StepResult[] = [];

  // Step 1: Daemon status when not running should report stopped
  {
    const start = Date.now();
    try {
      const result = await ctx.cli.run(['daemon', 'status']);
      // Exit code 2 = daemon not running (expected)
      assertEqual(result.exitCode, 2, 'daemon status exit code when not running');
      steps.push({
        label: 'Status reports not running',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Status reports not running',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 2: Daemon start
  {
    const start = Date.now();
    try {
      const result = await ctx.cli.runExpectSuccess(['daemon', 'start']);
      const r = result as Record<string, unknown>;
      assertTruthy(r.message, 'start should return a message');
      steps.push({ label: 'Daemon start', passed: true, durationMs: Date.now() - start });
    } catch (e) {
      steps.push({
        label: 'Daemon start',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
      // Can't continue without daemon
      return { name: 'Daemon Lifecycle', steps, skipped: false };
    }
  }

  // Step 3: Daemon status when running
  {
    const start = Date.now();
    try {
      const result = await ctx.cli.runExpectSuccess(['daemon', 'status']);
      const r = result as Record<string, unknown>;
      assertHasField(r, 'status', 'daemon status');
      assertEqual(r.status, 'running', 'status field');
      assertHasField(r, 'pid', 'daemon status pid');
      steps.push({ label: 'Status reports running', passed: true, durationMs: Date.now() - start });
    } catch (e) {
      steps.push({
        label: 'Status reports running',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 4: Daemon stop
  {
    const start = Date.now();
    try {
      const result = await ctx.cli.runExpectSuccess(['daemon', 'stop']);
      const r = result as Record<string, unknown>;
      assertTruthy(r.message, 'stop should return a message');
      steps.push({ label: 'Daemon stop', passed: true, durationMs: Date.now() - start });
    } catch (e) {
      steps.push({
        label: 'Daemon stop',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 5: Status after stop
  {
    const start = Date.now();
    try {
      // Give daemon a moment to fully shut down
      await new Promise((r) => setTimeout(r, 500));
      const result = await ctx.cli.run(['daemon', 'status']);
      assertEqual(result.exitCode, 2, 'daemon status exit code after stop');
      steps.push({
        label: 'Status reports stopped after stop',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Status reports stopped after stop',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  return { name: 'Daemon Lifecycle', steps, skipped: false };
}
