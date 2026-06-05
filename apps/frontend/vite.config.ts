/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		// The router plugin MUST be registered before @vitejs/plugin-react so it
		// can generate the route tree and apply automatic code-splitting.
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
			// Keep co-located *.test.tsx files in src/routes out of the route tree.
			routeFileIgnorePattern: "\\.test\\.[tj]sx?$",
		}),
		react(),
		// React Compiler (plugin-react v6+): apply the compiler preset via a
		// dedicated Babel pass. babel-plugin-react-compiler is pulled in by the preset.
		babel({ presets: [reactCompilerPreset()] }),
		tailwindcss(),
	],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		css: true,
	},
});
