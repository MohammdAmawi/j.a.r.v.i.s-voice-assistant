/**
 * J.A.R.V.I.S — Vitest Configuration
 * Configures Vitest for React + Electron hybrid testing with jsdom environment.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    // Use jsdom to simulate browser/renderer environment for React components
    environment: 'jsdom',

    // Load global test setup (mocks for window.electronAPI, Audio, navigator, etc.)
    setupFiles: ['./src/__tests__/setup.ts'],

    // Global assertions (expect, describe, it, vi) available without imports
    globals: true,

    // Collect coverage from all relevant source files
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/services/**/*.ts',
        'src/components/**/*.tsx',
        'src/types.ts',
      ],
      exclude: [
        'src/__tests__/**',
        'src/main.tsx',
        'src/audio/**',
      ],
    },

    // Test file discovery
    include: [
      'src/__tests__/**/*.test.{ts,tsx}',
      'electron/__tests__/**/*.test.{ts,js}',
    ],

    // Timeout for IPC / async tests (15s per test)
    testTimeout: 15000,
  },
});
