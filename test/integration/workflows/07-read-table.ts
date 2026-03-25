/**
 * Workflow 07: Read Table
 *
 * Tests the read-table CLI command by reading an Advanced Table configured
 * via integration test config.
 *
 * Prerequisites:
 * - Config file must exist at $HOME/.remnote-mcp-bridge/remnote-mcp-bridge.json
 * - Must contain integrationTest.tableName
 */

import {
  hasTableConfig,
  getIntegrationTestConfig,
  getTableConfigWarning,
} from '../../helpers/integration-config.js';
import type { CliTestClient } from '../cli-test-client.js';
import type { WorkflowResult, SharedState, StepResult } from '../types';

interface CliContext {
  cli: CliTestClient;
  runId: string;
}

/** Expected structure of read-table JSON output */
interface ReadTableResponse {
  columns: Array<{ name: string; propertyId: string; type: string }>;
  rows: Array<{ name: string; remId: string; values: Record<string, string[]> }>;
}

export async function readTableWorkflow(
  ctx: CliContext,
  _state: SharedState
): Promise<WorkflowResult> {
  const steps: StepResult[] = [];

  // Check if table config exists - skip test if not configured
  if (!hasTableConfig()) {
    const warning = getTableConfigWarning();
    steps.push({
      label: 'Table config check',
      passed: false,
      durationMs: 0,
      error: warning,
    });
    return {
      name: 'Read Table',
      steps,
      skipped: false,
    };
  }

  const config = getIntegrationTestConfig()!;
  const tableName = config.tableName!;

  // Step 1: Basic read-table command
  {
    const start = Date.now();
    try {
      const result = await ctx.cli.run(['read-table', tableName]);

      if (result.exitCode !== 0) {
        throw new Error(
          `CLI exited with code ${result.exitCode}: ${result.stderr || result.stdout}`
        );
      }

      // Verify JSON output
      const data = result.json as ReadTableResponse;
      if (!data || typeof data !== 'object') {
        throw new Error(`Expected JSON object, got: ${result.stdout}`);
      }

      // Verify columns and rows
      if (!('columns' in data)) {
        throw new Error('Response missing columns field');
      }
      if (!('rows' in data)) {
        throw new Error('Response missing rows field');
      }

      if (!Array.isArray(data.columns)) {
        throw new Error('columns should be an array');
      }
      if (!Array.isArray(data.rows)) {
        throw new Error('rows should be an array');
      }

      steps.push({
        label: `Read table (${data.columns.length} columns, ${data.rows.length} rows)`,
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Read table',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 2: read-table with --limit option
  {
    const start = Date.now();
    try {
      const result = await ctx.cli.run(['read-table', tableName, '--limit', '1']);

      if (result.exitCode !== 0) {
        throw new Error(
          `CLI exited with code ${result.exitCode}: ${result.stderr || result.stdout}`
        );
      }

      const data = result.json as ReadTableResponse;
      if (!Array.isArray(data.rows)) {
        throw new Error('rows should be an array');
      }
      if (data.rows.length > 1) {
        throw new Error(`limit=1 should return at most 1 row, got ${data.rows.length}`);
      }

      steps.push({
        label: 'Read table with --limit 1',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Read table with --limit 1',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 3: read-table with --offset option
  {
    const start = Date.now();
    try {
      const result = await ctx.cli.run(['read-table', tableName, '--offset', '1']);

      if (result.exitCode !== 0) {
        throw new Error(
          `CLI exited with code ${result.exitCode}: ${result.stderr || result.stdout}`
        );
      }

      const data = result.json as ReadTableResponse;
      if (!Array.isArray(data.rows)) {
        throw new Error('rows should be an array');
      }

      steps.push({
        label: 'Read table with --offset 1',
        passed: true,
        durationMs: Date.now() - start,
      });
    } catch (e) {
      steps.push({
        label: 'Read table with --offset 1',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  // Step 4: read-table with non-existent table
  {
    const start = Date.now();
    try {
      const result = await ctx.cli.run(['read-table', 'Non-Existent-Table-xyz-123']);

      // Accept both success (empty results) and error (table not found)
      // The important thing is the CLI doesn't crash
      const data = result.json as Record<string, unknown> | null;

      if (result.exitCode === 0 && data) {
        // Success with possibly empty results
        if (!('columns' in data) || !('rows' in data)) {
          throw new Error('Success response should have columns and rows');
        }
        steps.push({
          label: 'Read non-existent table',
          passed: true,
          durationMs: Date.now() - start,
        });
      } else if (result.exitCode !== 0) {
        // Error is acceptable for non-existent table
        steps.push({
          label: 'Read non-existent table',
          passed: true,
          durationMs: Date.now() - start,
          error: `Expected error (acceptable): ${result.stderr || result.stdout}`,
        });
      } else {
        throw new Error('Unexpected response for non-existent table');
      }
    } catch (e) {
      steps.push({
        label: 'Read non-existent table',
        passed: false,
        durationMs: Date.now() - start,
        error: (e as Error).message,
      });
    }
  }

  return { name: 'Read Table', steps, skipped: false };
}
