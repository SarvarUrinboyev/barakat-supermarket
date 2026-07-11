import { defineConfig } from 'vitest/config';

// Unit tests only (pure logic under src/). The e2e/ directory is Playwright and
// must not be collected by vitest.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{js,jsx}'],
    environment: 'node',
  },
});
