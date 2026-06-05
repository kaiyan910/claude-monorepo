import {
	type CanActivate,
	type ExecutionContext,
	Inject,
	Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import {
	TOKEN_SERVICE,
	type TokenService,
} from "@/auth/application/token.service";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";

/** Principal attached to the request after a successful guard check. */
export interface AuthenticatedUser {
	userId: string;
	username: string;
	isRoot: boolean;
}

/**
 * Validates the `Authorization: Bearer <token>` header as an access token and
 * attaches the principal to req.user. Missing/malformed header → AUTH_UNAUTHORIZED;
 * invalid/expired token → AUTH_INVALID_TOKEN (from TokenService).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(@Inject(TOKEN_SERVICE) private readonly tokens: TokenService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context
			.switchToHttp()
			.getRequest<Request & { user?: AuthenticatedUser }>();
		const token = this.extractBearerToken(req.headers.authorization);
		const payload = await this.tokens.verifyAccess(token);
		req.user = {
			userId: payload.sub,
			username: payload.username,
			isRoot: payload.isRoot,
		};
		return true;
	}

	private extractBearerToken(header: string | undefined): string {
		if (!header) {
			throw new UnauthorizedError();
		}
		const [scheme, token] = header.split(" ");
		if (scheme !== "Bearer" || !token) {
			throw new UnauthorizedError();
		}
		return token;
	}
}
