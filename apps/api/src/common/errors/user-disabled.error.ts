import { HttpException, HttpStatus } from "@nestjs/common";
import type { AppException } from "@/common/errors/app.exception";

/**
 * Thrown when a user account exists but has been administratively disabled.
 * Returns 403 so the caller knows the credentials were valid but access is denied.
 */
export class UserDisabledError extends HttpException implements AppException {
	readonly code = "AUTH_USER_DISABLED";

	constructor() {
		super("User account is disabled", HttpStatus.FORBIDDEN);
	}
}
