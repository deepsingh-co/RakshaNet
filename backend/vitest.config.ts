import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    // All suites share one MongoDB test database and clear collections at
    // startup, so files must not run concurrently.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/suraksha_ai_test',
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      OTP_MODE: 'console',
      NOTIFICATION_WEBHOOK_SECRET: 'test-webhook-secret',
      // A developer's backend/.env must never switch the suite into live mode
      // or make real provider calls.
      AI_MODE: 'console',
      GNANI_API_KEY: '',
    },
  },
});
