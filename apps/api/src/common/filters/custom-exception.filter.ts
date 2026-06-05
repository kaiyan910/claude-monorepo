import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { AppException } from "@/common/errors/app.exception";

/** Maps common HTTP statuses to a default error code for non-custom exceptions. */
const STATUS_CODE_MAP: Record<number, string> = {
	[HttpStatus.BAD_REQUEST]: "VALIDATION_ERROR",
	[HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
	[HttpStatus.FORBIDDEN]: "FORBIDDEN",
	[HttpStatus.NOT_FOUND]: "NOT_FOUND",
	[HttpStatus.METHOD_NOT_ALLOWED]: "METHOD_NOT_ALLOWED",
};

function hasCode(value: unknown): value is AppException {
	return (
		typeof value === "object" &&
		value !== null &&
		"code" in value &&
		typeof (value as { code: unknown }).code === "string"
	);
}

/**
 * Catches every exception (custom, framework, or unknown) and returns the
 * Standard Error Response. No raw NestJS/Express error shape ever reaches the
 * client. `code` is what the frontend maps to user-facing text.
 */
@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const res = ctx.getResponse<Response>();
		const req = ctx.getRequest<Request & { requestId?: string }>();
		const traceId = req.requestId ?? "unknown";

		let httpCode = HttpStatus.INTERNAL_SERVER_ERROR;
		let code = "INTERNAL_ERROR";
		let message = "Internal server error";

		if (exception instanceof HttpException) {
			httpCode = exception.getStatus();
			message = this.extractMessage(exception);
			code = hasCode(exception)
				? exception.code
				: (STATUS_CODE_MAP[httpCode] ?? "HTTP_ERROR");
		}

		res.status(httpCode).json({
			httpCode,
			code,
			message,
			traceId,
			createdAt: new Date().toISOString(),
		});
	}

	private extractMessage(exception: HttpException): string {
		const response = exception.getResponse();
		if (typeof response === "string") {
			return response;
		}
		if (
			typeof response === "object" &&
			response !== null &&
			"message" in response
		) {
			const raw = (response as Record<string, unknown>).message;
			if (Array.isArray(raw)) {
				return raw.join(", ");
			}
			if (typeof raw === "string") {
				return raw;
			}
		}
		return exception.message;
	}
}
