import { defineConfig } from 'vitest/config'

// Unit tests for pure server/shared logic (no Nuxt runtime, no database).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
