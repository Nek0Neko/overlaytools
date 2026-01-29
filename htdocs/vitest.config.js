import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['tests/**/*.test.js'],
        coverage: {
            reporter: ['text', 'html'],
            include: ['*.js'],
            exclude: ['vitest.config.js', 'eslint.config.js', 'tests/**']
        }
    }
});
