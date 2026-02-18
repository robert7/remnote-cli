# Development Setup

## Clone and Install

```bash
git clone https://github.com/robert7/remnote-cli.git
cd remnote-cli
source ./node-check.sh && npm install
```

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
