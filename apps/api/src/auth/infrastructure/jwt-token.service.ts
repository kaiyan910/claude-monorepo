import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { StringValue } from "ms";
import type {
	AccessTokenPayload,
	RefreshTokenPayload,
	TokenService,
} from "@/auth/application/token.service";
import { InvalidTokenError } from "@/common/errors/invalid-token.error";

interface SignedAccess extends AccessTokenPayload {
	type: "access";
}

interface SignedRefresh extends RefreshTokenPayload {
	type: "refresh";
}

/**
 * @nestjs/jwt implementation of the TokenService port. Signs access and refresh
 * tokens with separate secrets and embeds a `type` claim so tokens cannot be
 * used interchangeably. Verification always strips the internal `type` field
 * before returning the public payload.
 */
@Injectable()
export class JwtTokenService implements TokenService {
	constructor(
		private readonly jwt: JwtService,
		private readonly config: ConfigService,
	) {}

	signAccess(payload: AccessTokenPayload): Promise<string> {
		return this.jwt.signAsync(
			{ ...payload, type: "access" },
			{
				secret: this.config.get<string>("ACCESS_TOKEN_SECRET"),
				expiresIn: this.requireConfig("ACCESS_TOKEN_TTL") as StringValue,
			},
		);
	}

	signRefresh(payload: RefreshTokenPayload): Promise<string> {
		return this.jwt.signAsync(
			{ ...payload, type: "refresh" },
			{
				secret: this.config.get<string>("REFRESH_TOKEN_SECRET"),
				expiresIn: this.requireConfig("REFRESH_TOKEN_TTL") as StringValue,
			},
		);
	}

	/** Reads a required config value, throwing if absent. */
	private requireConfig(key: string): string {
		const value = this.config.get<string>(key);
		if (!value) {
			throw new Error(`Missing required config: ${key}`);
		}
		return value;
	}

	async verifyAccess(token: string): Promise<AccessTokenPayload> {
		const decoded = await this.verify<SignedAccess>(
			token,
			"ACCESS_TOKEN_SECRET",
		);
		if (decoded.type !== "access") {
			throw new InvalidTokenError();
		}
		const { sub, username, isRoot } = decoded;
		return { sub, username, isRoot };
	}

	async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
		const decoded = await this.verify<SignedRefresh>(
			token,
			"REFRESH_TOKEN_SECRET",
		);
		if (decoded.type !== "refresh") {
			throw new InvalidTokenError();
		}
		return { sub: decoded.sub };
	}

	private async verify<T extends object>(
		token: string,
		secretKey: string,
	): Promise<T> {
		try {
			return await this.jwt.verifyAsync<T>(token, {
				secret: this.config.get<string>(secretKey),
			});
		} catch {
			throw new InvalidTokenError();
		}
	}
}
