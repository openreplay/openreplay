import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  define: { global: 'window' },
  test: {
    environment: "jsdom",
    coverage: {
      provider: 'istanbul' // or 'v8'
    },
  }
}));