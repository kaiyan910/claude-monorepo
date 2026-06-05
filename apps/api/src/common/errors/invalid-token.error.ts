import { HttpException, HttpStatus } from "@nestjs/common";
import type { AppException } from "@/common/errors/app.exception";

/**
 * Thrown when a JWT cannot be verified — expired, malformed, wrong secret, or
 * wrong token type (e.g. refresh token used where access token is expected).
 */
export class InvalidTokenError extends HttpException implements AppException {
	readonly code = "AUTH_INVALID_TOKEN";

	constructor() {
		super("Invalid or expired token", HttpStatus.UNAUTHORIZED);
	}
}
