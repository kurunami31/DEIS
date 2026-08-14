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
    env: {
      GOOGLE_CLIENT_ID: 'google-test-client-id.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'GOCSPX-test-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:4000/api/auth/google/callback',
    },
  },
});