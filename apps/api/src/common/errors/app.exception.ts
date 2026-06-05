/**
 * Shared contract for the app's custom exceptions: a stable `code` the frontend
 * maps to user-facing text. CustomExceptionFilter narrows to this via a guard.
 */
export interface AppException {
	readonly code: string;
}
