# Development Setup

## Clone and Install

```bash
git clone https://github.com/robert7/remnote-cli.git
cd remnote-cli
source ./node-check.sh && npm install
```

Use Node.js 20.19.0+ for local development and runtime. The repo's `.nvmrc` and `node-check.sh` are aligned to that
floor, and `node-check.sh` will accept newer installed Node versions when they still satisfy it.

> If you are testing against an existing bridge plugin install, match your local CLI checkout/version to the bridge plugin version line (`0.x` semver). See the [Bridge / Consumer Version Compatibility Guide](https://github.com/robert7/remnote-mcp-bridge/blob/main/docs/guides/bridge-consumer-version-compatibility.md).

## Development Commands

```bash
npm run dev              # Run CLI once via tsx (no watch)
npm run dev:watch        # Watch mode (tsx)
npm run build            # Compile TypeScript
npm run typecheck        # Type check without emitting
npm test                 # Run unit tests
npm run test:watch       # Watch mode for tests
npm run test:coverage    # Tests with coverage report
npm run lint             # ESLint
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier format
npm run format:check     # Prettier check
./code-quality.sh        # Full quality suite (typecheck + lint + format + test + coverage)
```

## Code Quality

Run the full quality check before submitting changes:

```bash
source ./node-check.sh && ./code-quality.sh
```

This runs: TypeScript type check, ESLint, Prettier format check, unit tests, and coverage.

## Project Structure

- `src/` — TypeScript source
- `test/unit/` — Vitest unit tests
- `test/integration/` — Integration test workflows (requires live RemNote)
- `dist/` — Compiled JavaScript output
- `.agents/` — AI agent collaboration files
- `docs/` — Documentation guides
