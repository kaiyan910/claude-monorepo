import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth.store";

describe("authStore", () => {
	beforeEach(() => {
		useAuthStore.getState().clear();
		localStorage.clear();
	});

	it("starts unauthenticated with null tokens", () => {
		const state = useAuthStore.getState();
		expect(state.accessToken).toBeNull();
		expect(state.refreshToken).toBeNull();
		expect(state.isAuthenticated).toBe(false);
	});

	it("setTokens stores the pair and marks authenticated", () => {
		useAuthStore
			.getState()
			.setTokens({ accessToken: "a.b.c", refreshToken: "r.e.f" });

		const state = useAuthStore.getState();
		expect(state.accessToken).toBe("a.b.c");
		expect(state.refreshToken).toBe("r.e.f");
		expect(state.isAuthenticated).toBe(true);
	});

	it("clear resets to the unauthenticated state", () => {
		useAuthStore.getState().setTokens({ accessToken: "a", refreshToken: "r" });
		useAuthStore.getState().clear();

		const state = useAuthStore.getState();
		expect(state.accessToken).toBeNull();
		expect(state.isAuthenticated).toBe(false);
	});

	it("persists tokens to localStorage under 'auth-storage'", () => {
		useAuthStore.getState().setTokens({ accessToken: "a", refreshToken: "r" });

		const raw = localStorage.getItem("auth-storage");
		expect(raw).toContain("a");
	});
});
