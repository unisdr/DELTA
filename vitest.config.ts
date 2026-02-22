// vitest.config.ts
import { defineConfig } from "vitest/config";
import viteConfig from "./vite.config";
import { mergeConfig } from "vite";

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			setupFiles: "./tests/integration/db/setup.ts",
			environment: "node",
			globals: true,

			include: [
				"tests/unit/**/*.test.{ts,tsx}",
				"tests/integration/**/*.test.{ts,tsx}",
			],
			exclude: [
				"tests/e2e/**",
				"**/*.spec.{ts,tsx}",
				"**/node_modules/**",
				"**/build/**",
				"**/dist/**",
				// '**/*.test.{ts,tsx}',
				"**/__tests__/**",
				"app/entry.client.tsx",
				"app/entry.server.tsx",
			],
			coverage: {
				provider: "v8",
				include: ["app/**/*.{ts,tsx}"],

				exclude: [
					"**/*.test.{ts,tsx}",
					"**/*.spec.{ts,tsx}",
					"**/__tests__/**",
					"**/node_modules/**",
					"**/build/**",
					"**/dist/**",
					"app/entry.client.tsx",
					"app/entry.server.tsx",
				],

				reporter: ["text", "html", "lcov"],
			},
		},
	}),
);
