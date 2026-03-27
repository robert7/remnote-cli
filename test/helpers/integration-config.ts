/**
 * Integration test configuration utility.
 *
 * Reads configuration from the shared config file location:
 * $HOME/.remnote-mcp-bridge/remnote-mcp-bridge.json
 *
 * This allows users to configure integration tests without modifying code,
 * e.g., specifying a table name for read-table tests.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const CONFIG_DIR = '.remnote-mcp-bridge';
const CONFIG_FILE = 'remnote-mcp-bridge.json';
const LEGACY_CONFIG_FILE = '.remnote-mcp-bridge.json';

/** Config structure for integration tests. */
export interface IntegrationTestConfig {
  /** Preferred table Rem ID for deterministic read-table lookup coverage. */
  tableRemId?: string;
  /** Preferred table name for read-table name-lookup coverage. */
  tableName?: string;
  /** Backward-compatible fallback: table Rem ID or tag name for read-table tests. */
  tableNameOrId?: string;
}

/** Root config structure matching the JSON file schema. */
export interface RemnoteMcpBridgeConfig {
  integrationTest?: IntegrationTestConfig;
}

/**
 * Get the path to the config file in the user's home directory.
 */
export function getConfigPath(): string {
  return path.join(os.homedir(), CONFIG_DIR, CONFIG_FILE);
}

/**
 * Load the config file from the user's home directory.
 * Returns null if the file doesn't exist or is invalid JSON.
 */
export function loadConfig(): RemnoteMcpBridgeConfig | null {
  const candidatePaths = [getConfigPath(), path.join(os.homedir(), LEGACY_CONFIG_FILE)];

  for (const configPath of candidatePaths) {
    if (!fs.existsSync(configPath)) {
      continue;
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content) as RemnoteMcpBridgeConfig;
    } catch {
      // Keep trying other known config locations before giving up.
    }
  }

  return null;
}

/**
 * Get the integration test config section.
 * Returns null if the config file doesn't exist or has no integration test section.
 */
export function getIntegrationTestConfig(): IntegrationTestConfig | null {
  const config = loadConfig();
  return config?.integrationTest ?? null;
}

/**
 * Check if integration test config exists and has a tableName.
 */
export function hasTableConfig(): boolean {
  const config = getIntegrationTestConfig();
  return Boolean(config?.tableName || config?.tableRemId || config?.tableNameOrId);
}

/**
 * Get a warning message for when table config is missing.
 */
export function getTableConfigWarning(): string {
  return `Integration test table not configured. Set integrationTest.tableName and/or integrationTest.tableRemId in ${getConfigPath()}`;
}
