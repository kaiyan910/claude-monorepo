import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { JwtTokenService } from "@/auth/infrastructure/jwt-token.service";
import { InvalidTokenError } from "@/common/errors/invalid-token.error";

function makeService(): JwtTokenService {
	const config = {
		get: (key: string) =>
			({
				ACCESS_TOKEN_SECRET: "access-secret",
				REFRESH_TOKEN_SECRET: "refresh-secret",
				ACCESS_TOKEN_TTL: "15m",
				REFRESH_TOKEN_TTL: "7d",
			})[key],
	} as unknown as ConfigService;
	return new JwtTokenService(new JwtService({}), config);
}

describe("JwtTokenService", () => {
	it("signs and verifies an access token round-trip", async () => {
		const service = makeService();
		const token = await service.signAccess({
			sub: "u1",
			username: "root",
			isRoot: true,
		});
		const payload = await service.verifyAccess(token);
		expect(payload).toEqual({ sub: "u1", username: "root", isRoot: true });
	});

	it("signs and verifies a refresh token round-trip", async () => {
		const service = makeService();
		const token = await service.signRefresh({ sub: "u1" });
		const payload = await service.verifyRefresh(token);
		expect(payload).toEqual({ sub: "u1" });
	});

	it("rejects an access token presented as a refresh token", async () => {
		const service = makeService();
		const access = await service.signAccess({
			sub: "u1",
			username: "root",
			isRoot: true,
		});
		await expect(service.verifyRefresh(access)).rejects.toBeInstanceOf(
			InvalidTokenError,
		);
	});

	it("rejects a garbage token", async () => {
		const service = makeService();
		await expect(service.verifyAccess("not-a-jwt")).rejects.toBeInstanceOf(
			InvalidTokenError,
		);
	});

	it("rejects a token with the wrong type claim even when the secret is valid (access)", async () => {
		const service = makeService();
		const raw = new JwtService({});
		// signed with the ACCESS secret but carrying a refresh type claim
		const token = await raw.signAsync(
			{ sub: "u1", username: "root", isRoot: true, type: "refresh" },
			{ secret: "access-secret" },
		);
		await expect(service.verifyAccess(token)).rejects.toBeInstanceOf(
			InvalidTokenError,
		);
	});

	it("rejects a token with the wrong type claim even when the secret is valid (refresh)", async () => {
		const service = makeService();
		const raw = new JwtService({});
		// signed with the REFRESH secret but carrying an access type claim
		const token = await raw.signAsync(
			{ sub: "u1", type: "access" },
			{ secret: "refresh-secret" },
		);
		await expect(service.verifyRefresh(token)).rejects.toBeInstanceOf(
			InvalidTokenError,
		);
	});

	it("rejects an expired access token", async () => {
		const service = makeService();
		const raw = new JwtService({});
		const token = await raw.signAsync(
			{ sub: "u1", username: "root", isRoot: true, type: "access" },
			{ secret: "access-secret", expiresIn: "-1s" },
		);
		await expect(service.verifyAccess(token)).rejects.toBeInstanceOf(
			InvalidTokenError,
		);
	});
});
