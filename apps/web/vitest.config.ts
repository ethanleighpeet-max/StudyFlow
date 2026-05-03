import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@studyflow/shared': resolve(__dirname, '../../packages/shared/src'),
      '@studyflow/db': resolve(__dirname, '../../packages/db/src'),
      '@studyflow/ui': resolve(__dirname, '../../packages/ui/src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts'],
    },
  },
});
