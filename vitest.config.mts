import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['tests/**/*.spec.ts'],
    fileParallelism: false,
  },
});
