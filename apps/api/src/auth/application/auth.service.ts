import { Inject, Injectable } from "@nestjs/common";
import {
	PASSWORD_HASHER,
	type PasswordHasher,
} from "@/auth/application/password-hasher";
import {
	TOKEN_SERVICE,
	type TokenPair,
	type TokenService,
} from "@/auth/application/token.service";
import { InvalidCredentialsError } from "@/common/errors/invalid-credentials.error";
import { InvalidTokenError } from "@/common/errors/invalid-token.error";
import { UserDisabledError } from "@/common/errors/user-disabled.error";
import {
	USER_REPOSITORY,
	type UserRepository,
} from "@/user/application/user.repository";
import type { User, UserProfile } from "@/user/domain/user.vo";

/**
 * Orchestrates authentication use cases through ports only — no Prisma, JWT, or
 * bcrypt details leak in here. login/refresh both re-check `enabled` so a
 * disabled account cannot obtain or renew tokens.
 */
@Injectable()
export class AuthService {
	constructor(
		@Inject(USER_REPOSITORY) private readonly users: UserRepository,
		@Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
		@Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
	) {}

	async login(username: string, password: string): Promise<TokenPair> {
		const user = await this.users.findByUsername(username);
		if (!user) {
			throw new InvalidCredentialsError();
		}
		const passwordMatches = await this.hasher.compare(
			password,
			user.passwordHash,
		);
		if (!passwordMatches) {
			throw new InvalidCredentialsError();
		}
		if (!user.enabled) {
			throw new UserDisabledError();
		}
		return this.issueTokens(user);
	}

	async refresh(refreshToken: string): Promise<TokenPair> {
		const payload = await this.tokens.verifyRefresh(refreshToken);
		const user = await this.users.findById(payload.sub);
		if (!user) {
			throw new InvalidTokenError();
		}
		if (!user.enabled) {
			throw new UserDisabledError();
		}
		return this.issueTokens(user);
	}

	async getProfile(userId: string): Promise<UserProfile> {
		const user = await this.users.findById(userId);
		if (!user) {
			throw new InvalidTokenError();
		}
		return user.toProfile();
	}

	private async issueTokens(user: User): Promise<TokenPair> {
		const [accessToken, refreshToken] = await Promise.all([
			this.tokens.signAccess({
				sub: user.id,
				username: user.username,
				isRoot: user.isRoot,
			}),
			this.tokens.signRefresh({ sub: user.id }),
		]);
		return { accessToken, refreshToken };
	}
}
