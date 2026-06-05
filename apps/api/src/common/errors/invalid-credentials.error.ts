import { HttpException, HttpStatus } from "@nestjs/common";
import type { AppException } from "@/common/errors/app.exception";

/**
 * Thrown when username/password combination does not match any known user.
 * Deliberately vague to avoid user enumeration.
 */
export class InvalidCredentialsError
	extends HttpException
	implements AppException
{
	readonly code = "AUTH_INVALID_CREDENTIALS";

	constructor() {
		super("Invalid username or password", HttpStatus.UNAUTHORIZED);
	}
}
