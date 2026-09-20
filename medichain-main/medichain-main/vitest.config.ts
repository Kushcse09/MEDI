import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use Node.js environment to get access to WebCrypto (globalThis.crypto)
    environment: "node",
    // Include test files from lib/crypto
    include: ["lib/**/*.test.ts"],
    // 30-second timeout for the 1000-IV uniqueness test
    testTimeout: 30000,
  },
});
