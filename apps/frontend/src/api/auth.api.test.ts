import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const get = vi.fn();
vi.mock("@/lib/api-client", () => ({
	apiClient: {
		post: (...args: unknown[]) => post(...args),
		get: (...args: unknown[]) => get(...args),
	},
}));

import { getMe, login } from "@/api/auth.api";

describe("auth.api", () => {
	beforeEach(() => {
		post.mockReset();
		get.mockReset();
	});

	it("login posts credentials and parses the token pair", async () => {
		post.mockResolvedValue({
			data: { accessToken: "a.b.c", refreshToken: "r.e.f" },
		});

		const result = await login({ username: "root", password: "pw" });

		expect(post).toHaveBeenCalledWith(
			"/auth/login",
			{ username: "root", password: "pw" },
			{ signal: undefined },
		);
		expect(result).toEqual({ accessToken: "a.b.c", refreshToken: "r.e.f" });
	});

	it("login throws when the response shape is invalid", async () => {
		post.mockResolvedValue({ data: { accessToken: 123 } });
		await expect(login({ username: "x", password: "y" })).rejects.toThrow();
	});

	it("getMe fetches and parses the profile, forwarding the signal", async () => {
		const controller = new AbortController();
		get.mockResolvedValue({
			data: {
				id: "u1",
				name: "Root",
				username: "root",
				email: "root@example.com",
				isRoot: true,
				enabled: true,
				createdAt: "2026-06-05T00:00:00.000Z",
				updatedAt: "2026-06-05T00:00:00.000Z",
			},
		});

		const result = await getMe(controller.signal);

		expect(get).toHaveBeenCalledWith("/auth/me", {
			signal: controller.signal,
		});
		expect(result.username).toBe("root");
	});
});
