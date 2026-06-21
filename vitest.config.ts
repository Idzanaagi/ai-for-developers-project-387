import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/__tests__/unit/**/*.test.ts', 'src/__tests__/integration/**/*.test.ts'],
    reporters: [
      'default',
      'allure-vitest/reporter',
    ],
  },
});
