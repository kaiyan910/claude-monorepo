import { HttpException, HttpStatus } from "@nestjs/common";
import type { AppException } from "@/common/errors/app.exception";

/**
 * Wraps unexpected persistence failures (e.g. Prisma errors) so infrastructure
 * exceptions never leak past the repository boundary as raw Error instances.
 */
export class DatabaseError extends HttpException implements AppException {
	readonly code = "DATABASE_ERROR";

	constructor(message: string) {
		super(message, HttpStatus.INTERNAL_SERVER_ERROR);
	}
}
