// vitest.config.ts
import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config';
import { mergeConfig } from 'vite';

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            setupFiles: './tests/setup.ts',
            environment: 'node',
            globals: true,

            coverage: {
                provider: 'v8',

                // 🔹 This replaces `all: true` in v4
                include: ['app/**/*.{ts,tsx}'],

                exclude: [
                    '**/*.test.{ts,tsx}',
                    '**/*.spec.{ts,tsx}',
                    '**/__tests__/**',
                    '**/node_modules/**',
                    '**/build/**',
                    '**/dist/**',
                    'app/entry.client.tsx',
                    'app/entry.server.tsx',
                ],

                reporter: ['text', 'html', 'lcov'],
            },
        },
    }),
);
