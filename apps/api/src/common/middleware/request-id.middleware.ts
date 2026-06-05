import { randomUUID } from "node:crypto";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

/**
 * Generates a UUID per request, attaches it to req.requestId, and echoes it in
 * the X-Request-Id response header. CustomExceptionFilter maps requestId →
 * traceId so the same id flows through logs and error responses.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
	use(
		req: Request & { requestId?: string },
		res: Response,
		next: NextFunction,
	): void {
		const id = randomUUID();
		req.requestId = id;
		res.setHeader("X-Request-Id", id);
		next();
	}
}
