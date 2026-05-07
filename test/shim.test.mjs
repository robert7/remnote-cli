import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

test("migration shim prints instructions and exits non-zero", () => {
  const result = spawnSync(process.execPath, [join(repoRoot, "index.js")], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /remnote-cli has moved/);
  assert.match(result.stderr, /0\.13\.1 was the last independent remnote-cli package version/);
  assert.match(result.stderr, /Starting with 0\.14\.0, remnote-cli is provided by remnote-mcp-server/);
  assert.match(result.stderr, /npm uninstall -g remnote-cli/);
  assert.match(result.stderr, /npm install -g remnote-mcp-server/);
});
