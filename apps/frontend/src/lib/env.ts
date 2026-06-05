import { z } from "zod";

/**
 * Schema for the Vite-injected environment. Unknown keys (MODE, DEV, …) are
 * stripped, so only the variables declared here are exposed to the app.
 */
const envSchema = z.object({
	VITE_API_BASE_URL: z.url(),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
	// Fail fast: a misconfigured environment should never reach the UI.
	console.error("Invalid environment variables:", z.treeifyError(parsed.error));
	throw new Error("Invalid environment variables. Check your .env file.");
}

/** Validated, strongly-typed environment configuration. */
export const env = parsed.data;
