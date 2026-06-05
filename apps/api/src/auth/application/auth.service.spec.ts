import { AuthService } from "@/auth/application/auth.service";
import type { PasswordHasher } from "@/auth/application/password-hasher";
import type { TokenService } from "@/auth/application/token.service";
import { InvalidCredentialsError } from "@/common/errors/invalid-credentials.error";
import { InvalidTokenError } from "@/common/errors/invalid-token.error";
import { UserDisabledError } from "@/common/errors/user-disabled.error";
import type { UserRepository } from "@/user/application/user.repository";
import { User } from "@/user/domain/user.vo";

function makeUser(overrides: Partial<{ enabled: boolean }> = {}): User {
	return new User({
		id: "u1",
		name: "Root",
		username: "root",
		password: "hashed",
		email: "root@example.com",
		isRoot: true,
		enabled: overrides.enabled ?? true,
		createdAt: new Date("2026-06-05T00:00:00.000Z"),
		updatedAt: new Date("2026-06-05T00:00:00.000Z"),
	});
}

function setup(opts: { user?: User | null; compare?: boolean }) {
	const users: jest.Mocked<UserRepository> = {
		findByUsername: jest.fn().mockResolvedValue(opts.user ?? null),
		findById: jest.fn().mockResolvedValue(opts.user ?? null),
	};
	const tokens: jest.Mocked<TokenService> = {
		signAccess: jest.fn().mockResolvedValue("access-token"),
		signRefresh: jest.fn().mockResolvedValue("refresh-token"),
		verifyAccess: jest.fn(),
		verifyRefresh: jest.fn().mockResolvedValue({ sub: "u1" }),
	};
	const hasher: jest.Mocked<PasswordHasher> = {
		compare: jest.fn().mockResolvedValue(opts.compare ?? true),
	};
	return {
		service: new AuthService(users, tokens, hasher),
		users,
		tokens,
		hasher,
	};
}

describe("AuthService.login", () => {
	it("returns a token pair on valid credentials", async () => {
		const { service, users } = setup({ user: makeUser(), compare: true });
		const result = await service.login("root", "pw");
		expect(result).toEqual({
			accessToken: "access-token",
			refreshToken: "refresh-token",
		});
		expect(users.findByUsername).toHaveBeenCalledWith("root");
	});

	it("throws InvalidCredentialsError when the user does not exist", async () => {
		const { service } = setup({ user: null });
		await expect(service.login("ghost", "pw")).rejects.toBeInstanceOf(
			InvalidCredentialsError,
		);
	});

	it("throws UserDisabledError when the user is disabled", async () => {
		const { service } = setup({
			user: makeUser({ enabled: false }),
			compare: true,
		});
		await expect(service.login("root", "pw")).rejects.toBeInstanceOf(
			UserDisabledError,
		);
	});

	it("throws InvalidCredentialsError when the password is wrong", async () => {
		const { service } = setup({ user: makeUser(), compare: false });
		await expect(service.login("root", "bad")).rejects.toBeInstanceOf(
			InvalidCredentialsError,
		);
	});

	it("throws InvalidCredentialsError for a disabled user when the password is wrong", async () => {
		const { service } = setup({
			user: makeUser({ enabled: false }),
			compare: false,
		});
		await expect(service.login("root", "bad")).rejects.toBeInstanceOf(
			InvalidCredentialsError,
		);
	});
});

describe("AuthService.refresh", () => {
	it("issues a fresh token pair for a valid refresh token", async () => {
		const { service, users } = setup({ user: makeUser() });
		const result = await service.refresh("refresh-token");
		expect(result).toEqual({
			accessToken: "access-token",
			refreshToken: "refresh-token",
		});
		expect(users.findById).toHaveBeenCalledWith("u1");
	});

	it("propagates InvalidTokenError when the refresh token is invalid", async () => {
		const { service, tokens } = setup({ user: makeUser() });
		(tokens.verifyRefresh as jest.Mock).mockRejectedValueOnce(
			new InvalidTokenError(),
		);
		await expect(service.refresh("bad-token")).rejects.toBeInstanceOf(
			InvalidTokenError,
		);
	});

	it("throws InvalidTokenError when the user no longer exists", async () => {
		const { service } = setup({ user: null });
		await expect(service.refresh("refresh-token")).rejects.toBeInstanceOf(
			InvalidTokenError,
		);
	});

	it("throws UserDisabledError when the user is disabled", async () => {
		const { service } = setup({ user: makeUser({ enabled: false }) });
		await expect(service.refresh("refresh-token")).rejects.toBeInstanceOf(
			UserDisabledError,
		);
	});
});

describe("AuthService.getProfile", () => {
	it("returns the profile without the password", async () => {
		const { service, users } = setup({ user: makeUser() });
		const profile = await service.getProfile("u1");
		expect(profile).not.toHaveProperty("password");
		expect(profile.username).toBe("root");
		expect(users.findById).toHaveBeenCalledWith("u1");
	});

	it("throws InvalidTokenError when the user is gone", async () => {
		const { service } = setup({ user: null });
		await expect(service.getProfile("u1")).rejects.toBeInstanceOf(
			InvalidTokenError,
		);
	});
});
