/**
 * Reads a required environment variable, throwing a descriptive error when it
 * is absent or set to an empty string. Keeps secret/config wiring fail-fast
 * instead of silently undefined.
 */
export function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
	const value = env[key];
	if (value === undefined || value === "") {
		throw new Error(`Missing required env var: ${key}`);
	}
	return value;
}
