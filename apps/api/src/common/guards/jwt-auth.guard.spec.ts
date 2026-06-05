import type { ExecutionContext } from "@nestjs/common";
import type { TokenService } from "@/auth/application/token.service";
import { InvalidTokenError } from "@/common/errors/invalid-token.error";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";

function makeContext(authorization?: string) {
	const req: { headers: Record<string, string | undefined>; user?: unknown } = {
		headers: { authorization },
	};
	const ctx = {
		switchToHttp: () => ({ getRequest: () => req }),
	} as unknown as ExecutionContext;
	return { ctx, req };
}

describe("JwtAuthGuard", () => {
	it("passes and attaches req.user for a valid Bearer token", async () => {
		const tokens = {
			verifyAccess: jest
				.fn()
				.mockResolvedValue({ sub: "u1", username: "root", isRoot: true }),
		} as unknown as TokenService;
		const guard = new JwtAuthGuard(tokens);
		const { ctx, req } = makeContext("Bearer good-token");

		await expect(guard.canActivate(ctx)).resolves.toBe(true);
		expect(req.user).toEqual({ userId: "u1", username: "root", isRoot: true });
	});

	it("throws UnauthorizedError when the header is missing", async () => {
		const tokens = { verifyAccess: jest.fn() } as unknown as TokenService;
		const guard = new JwtAuthGuard(tokens);
		const { ctx } = makeContext(undefined);
		await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
			UnauthorizedError,
		);
	});

	it("throws UnauthorizedError when the scheme is not Bearer", async () => {
		const tokens = { verifyAccess: jest.fn() } as unknown as TokenService;
		const guard = new JwtAuthGuard(tokens);
		const { ctx } = makeContext("Basic abc");
		await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
			UnauthorizedError,
		);
	});

	it("propagates InvalidTokenError when verification fails", async () => {
		const tokens = {
			verifyAccess: jest.fn().mockRejectedValue(new InvalidTokenError()),
		} as unknown as TokenService;
		const guard = new JwtAuthGuard(tokens);
		const { ctx } = makeContext("Bearer bad-token");
		await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
			InvalidTokenError,
		);
	});
});
