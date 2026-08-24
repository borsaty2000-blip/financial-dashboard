import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			environment: "jsdom",
			setupFiles: "./src/test/setup.ts",
			restoreMocks: true,
			coverage: {
				provider: "v8",
				reporter: ["text", "html"],
				reportsDirectory: "./coverage",
				include: ["src/**/*.{ts,tsx}"],
				exclude: [
					"src/**/*.test.{ts,tsx}",
					"src/test/**",
					"src/App.tsx",
					"src/modules/financial-report/ui/FinancialBarChart.tsx",
				],
			},
		},
	}),
);
