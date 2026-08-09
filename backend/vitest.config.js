import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 30000,
    restoreMocks: true,
    sequence: { concurrent: false },
    // The integration suites share one fixture student; run files serially.
    fileParallelism: false,
    pool: 'forks',
  },
});