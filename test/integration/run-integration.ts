/**
 * Integration test runner for RemNote CLI.
 *
 * Runs real CLI commands against a live daemon with a connected RemNote plugin.
 * Creates real content in RemNote — all prefixed with [CLI-TEST] for easy cleanup.
 *
 * Usage:
 *   npm run test:integration          # Interactive — prompts for confirmation
 *   npm run test:integration -- --yes # Skip confirmation prompt
 *
 * Environment variables:
 *   CLI_CONTROL_PORT — Daemon control port (default: 3100)
 *   CLI_TEST_DELAY   — Delay in ms after create before search (default: 2000)
 */

import * as readline from 'node:readline';
import { CliTestClient } from './cli-test-client.js';
import { statusWorkflow } from './workflows/02-status.js';
import { createSearchWorkflow } from './workflows/03-create-search.js';
import { readUpdateWorkflow } from './workflows/04-read-update.js';
import { journalWorkflow } from './workflows/05-journal.js';
import { errorCasesWorkflow } from './workflows/06-error-cases.js';
import type { WorkflowResult, WorkflowFn, SharedState } from './types.js';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function printBanner(): void {
  console.log(`
${BOLD}╔═══════════════════════════════════════════════╗
║  RemNote CLI — Integration Tests              ║
║  ${YELLOW}WARNING: Creates real content in RemNote!${RESET}${BOLD}    ║
╚═══════════════════════════════════════════════╝${RESET}
`);
}

async function confirmPrompt(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Continue? (y/N) ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

function printStepResult(label: string, passed: boolean, durationMs: number, error?: string): void {
  const icon = passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  const timing = `${DIM}(${durationMs}ms)${RESET}`;
  console.log(`  ${icon} ${label} ${timing}`);
  if (error) {
    console.log(`    ${RED}${error}${RESET}`);
  }
}

function printWorkflowResult(index: number, result: WorkflowResult): void {
  const prefix = String(index + 1).padStart(2, '0');
  if (result.skipped) {
    console.log(`\n${DIM}[${prefix}] ${result.name} (skipped)${RESET}`);
  } else {
    console.log(`\n[${prefix}] ${result.name}`);
  }
  for (const step of result.steps) {
    printStepResult(step.label, step.passed, step.durationMs, step.error);
  }
}

function printSummary(results: WorkflowResult[], totalDurationMs: number): void {
  const totalWorkflows = results.length;
  const passedWorkflows = results.filter(
    (r) => !r.skipped && r.steps.every((s) => s.passed)
  ).length;
  const totalSteps = results.reduce((sum, r) => sum + r.steps.length, 0);
  const passedSteps = results.reduce((sum, r) => sum + r.steps.filter((s) => s.passed).length, 0);

  const allPassed = passedWorkflows === totalWorkflows;
  const color = allPassed ? GREEN : RED;

  console.log(`\n${BOLD}═══ Summary ═══${RESET}`);
  console.log(
    `${color}${passedWorkflows}/${totalWorkflows} workflows passed (${passedSteps}/${totalSteps} steps)${RESET}`
  );
  console.log(`Duration: ${(totalDurationMs / 1000).toFixed(1)}s`);

  console.log(`\n${BOLD}═══ Cleanup ═══${RESET}`);
  console.log('Test artifacts created with prefix [CLI-TEST].');
  console.log('Search your RemNote KB for "[CLI-TEST]" to find and delete them.');
}

async function main(): Promise<void> {
  const skipConfirm = process.argv.includes('--yes');
  const controlPort = parseInt(process.env.CLI_CONTROL_PORT ?? '3100', 10);
  const runId = new Date().toISOString();

  printBanner();

  console.log(`Control port: ${controlPort}`);
  console.log(`Run ID: ${runId}`);
  console.log('');

  if (!skipConfirm) {
    const confirmed = await confirmPrompt();
    if (!confirmed) {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  const cli = new CliTestClient(controlPort);
  const results: WorkflowResult[] = [];
  const state: SharedState = {};
  const overallStart = Date.now();

  // Preflight: integration tests require an already running daemon.
  const daemonStatus = await cli.run(['daemon', 'status']);
  if (daemonStatus.exitCode !== 0) {
    console.error(`${RED}Daemon is not running on control port ${controlPort}.${RESET}`);
    console.error(`Start it first, for example: ./run-daemon-in-foreground.sh`);
    process.exit(1);
  }

  // Define workflow sequence
  const workflows: Array<{ name: string; fn: WorkflowFn }> = [
    { name: 'Status Check', fn: statusWorkflow },
    { name: 'Create & Search', fn: createSearchWorkflow },
    { name: 'Read & Update', fn: readUpdateWorkflow },
    { name: 'Journal', fn: journalWorkflow },
    { name: 'Error Cases', fn: errorCasesWorkflow },
  ];

  for (let i = 0; i < workflows.length; i++) {
    const workflow = workflows[i];

    // If status check failed, skip remaining workflows
    if (i > 0 && results[0] && results[0].steps.some((s) => !s.passed)) {
      const skippedResult: WorkflowResult = {
        name: workflow.name,
        steps: [
          {
            label: 'Skipped — status check failed',
            passed: false,
            durationMs: 0,
            error: 'Prerequisite workflow 01 (Status Check) failed',
          },
        ],
        skipped: true,
      };
      results.push(skippedResult);
      printWorkflowResult(i, skippedResult);
      continue;
    }

    const result = await workflow.fn({ cli, runId }, state);
    results.push(result);
    printWorkflowResult(i, result);
  }

  const totalDuration = Date.now() - overallStart;
  printSummary(results, totalDuration);

  const allPassed = results.every((r) => !r.skipped && r.steps.every((s) => s.passed));
  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(`\n${RED}Unexpected error: ${(e as Error).message}${RESET}`);
  process.exit(1);
});
