/**
 * Maps backend API error `code`s to keys in the `auth` i18n namespace. The UI
 * resolves the returned key with `t()` so user-facing copy stays localized and
 * decoupled from the raw server message.
 */
const API_ERROR_KEYS: Record<string, string> = {
	AUTH_INVALID_CREDENTIALS: "errors.invalidCredentials",
	AUTH_USER_DISABLED: "errors.userDisabled",
	VALIDATION_ERROR: "errors.validation",
	NETWORK_ERROR: "errors.network",
	UNKNOWN: "errors.unknown",
};

export function errorKeyFromCode(code: string | undefined): string {
	if (code && code in API_ERROR_KEYS) {
		return API_ERROR_KEYS[code];
	}
	return API_ERROR_KEYS.UNKNOWN;
}
