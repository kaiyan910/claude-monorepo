import { HttpException, HttpStatus } from "@nestjs/common";
import type { AppException } from "@/common/errors/app.exception";

/**
 * Thrown when a request reaches a protected route without a valid Bearer token
 * in the Authorization header (missing or malformed header, not token content).
 */
export class UnauthorizedError extends HttpException implements AppException {
	readonly code = "AUTH_UNAUTHORIZED";

	constructor() {
		super("Missing or malformed authorization header", HttpStatus.UNAUTHORIZED);
	}
}
