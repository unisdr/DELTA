import { defineConfig } from "vitest/config";
import viteConfig from "./vite.config";
import { mergeConfig } from "vite";

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			setupFiles: "./tests/integration-realdb/setup.ts",
			environment: "node",
			globals: true,

			include: ["tests/integration-realdb/**/*.test.{ts,tsx}"],

			exclude: [
				"tests/e2e/**",
				"tests/unit/**",
				"tests/integration/**",
				"**/*.spec.{ts,tsx}",
				"**/node_modules/**",
				"**/build/**",
				"**/dist/**",
			],

			testTimeout: 60000,
			hookTimeout: 60000,
		},
	}),
);
