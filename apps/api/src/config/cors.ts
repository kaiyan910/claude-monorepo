import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

const DEFAULT_DEV_ORIGIN = "http://localhost:5173";

/**
 * Builds the CORS options from the environment. `CORS_ORIGIN` is a
 * comma-separated list of allowed browser origins; when unset or empty it
 * falls back to the Vite dev origin so local development needs no extra
 * configuration. Credentials are disabled — auth is Bearer-token based, so no
 * cookies cross origins.
 */
export function buildCorsOptions(env: NodeJS.ProcessEnv): CorsOptions {
	const origins = (env.CORS_ORIGIN ?? "")
		.split(",")
		.map((origin) => origin.trim())
		.filter((origin) => origin.length > 0);

	return {
		origin: origins.length > 0 ? origins : [DEFAULT_DEV_ORIGIN],
		credentials: false,
	};
}
