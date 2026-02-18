import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    exclude: ['node_modules/**', 'test/integration/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.config.ts',
        'test/**',
        'src/index.ts',
        // Daemon runtime code — covered by integration tests, not unit tests
        'src/daemon/daemon-server.ts',
        'src/daemon/lifecycle.ts',
        'src/logger.ts',
        // Command handlers — thin wrappers around daemon-client, covered by integration tests
        'src/commands/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
