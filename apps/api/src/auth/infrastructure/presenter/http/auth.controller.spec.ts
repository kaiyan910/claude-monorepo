import type { Request } from "express";
import type { AuthService } from "@/auth/application/auth.service";
import { AuthController } from "@/auth/infrastructure/presenter/http/auth.controller";
import type { AuthenticatedUser } from "@/common/guards/jwt-auth.guard";

describe("AuthController", () => {
	const pair = { accessToken: "a", refreshToken: "r" };

	it("login delegates to AuthService.login", async () => {
		const auth = {
			login: jest.fn().mockResolvedValue(pair),
		} as unknown as AuthService;
		const controller = new AuthController(auth);
		const result = await controller.login({ username: "root", password: "pw" });
		expect(auth.login).toHaveBeenCalledWith("root", "pw");
		expect(result).toBe(pair);
	});

	it("refresh delegates to AuthService.refresh", async () => {
		const auth = {
			refresh: jest.fn().mockResolvedValue(pair),
		} as unknown as AuthService;
		const controller = new AuthController(auth);
		const result = await controller.refresh({ refreshToken: "r" });
		expect(auth.refresh).toHaveBeenCalledWith("r");
		expect(result).toBe(pair);
	});

	it("me delegates to AuthService.getProfile using req.user.userId", async () => {
		const profile = { username: "root" };
		const auth = {
			getProfile: jest.fn().mockResolvedValue(profile),
		} as unknown as AuthService;
		const controller = new AuthController(auth);
		const user: AuthenticatedUser = {
			userId: "u1",
			username: "root",
			isRoot: true,
		};
		const result = await controller.me({ user } as Request & {
			user: AuthenticatedUser;
		});
		expect(auth.getProfile).toHaveBeenCalledWith("u1");
		expect(result).toBe(profile);
	});
});
