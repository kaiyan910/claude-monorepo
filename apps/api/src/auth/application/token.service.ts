/** DI token for the TokenService port. */
export const TOKEN_SERVICE = Symbol("TOKEN_SERVICE");

export interface AccessTokenPayload {
	sub: string;
	username: string;
	isRoot: boolean;
}

export interface RefreshTokenPayload {
	sub: string;
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
}

/**
 * Issues and verifies signed JWTs. Access and refresh tokens use separate
 * secrets and carry a `type` claim that verification enforces, so the two are
 * never interchangeable.
 */
export interface TokenService {
	signAccess(payload: AccessTokenPayload): Promise<string>;
	signRefresh(payload: RefreshTokenPayload): Promise<string>;
	verifyAccess(token: string): Promise<AccessTokenPayload>;
	verifyRefresh(token: string): Promise<RefreshTokenPayload>;
}
