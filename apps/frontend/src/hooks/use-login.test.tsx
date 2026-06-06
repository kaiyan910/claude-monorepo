import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLogin } from "@/hooks/use-login";
import { useAuthStore } from "@/store/auth.store";

const loginFn = vi.fn();
vi.mock("@/api/auth.api", () => ({
	login: (...args: unknown[]) => loginFn(...args),
}));

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigate,
}));

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
	loginFn.mockReset();
	navigate.mockReset();
	useAuthStore.getState().clear();
});

describe("useLogin", () => {
	it("stores tokens and navigates home on success", async () => {
		loginFn.mockResolvedValue({ accessToken: "a", refreshToken: "r" });

		const { result } = renderHook(() => useLogin(), { wrapper });
		act(() => {
			result.current.mutate({ username: "root", password: "pw" });
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(useAuthStore.getState().isAuthenticated).toBe(true);
		expect(useAuthStore.getState().accessToken).toBe("a");
		expect(navigate).toHaveBeenCalledWith({ to: "/" });
	});

	it("does not authenticate when login fails", async () => {
		loginFn.mockRejectedValue(new Error("bad creds"));

		const { result } = renderHook(() => useLogin(), { wrapper });
		act(() => {
			result.current.mutate({ username: "root", password: "wrong" });
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(useAuthStore.getState().isAuthenticated).toBe(false);
		expect(navigate).not.toHaveBeenCalled();
	});
});
