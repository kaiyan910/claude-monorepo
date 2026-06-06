import { create } from "zustand";
import { persist } from "zustand/middleware";

type TokenPair = {
	accessToken: string;
	refreshToken: string;
};

type AuthState = {
	accessToken: string | null;
	refreshToken: string | null;
	isAuthenticated: boolean;
	setTokens: (tokens: TokenPair) => void;
	clear: () => void;
};

/**
 * Auth session store. Persists the issued JWT pair to localStorage so a page
 * refresh keeps the user signed in. `isAuthenticated` is the single source of
 * truth consumed by route guards and the axios interceptor.
 */
export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			accessToken: null,
			refreshToken: null,
			isAuthenticated: false,
			setTokens: ({ accessToken, refreshToken }) =>
				set({ accessToken, refreshToken, isAuthenticated: true }),
			clear: () =>
				set({
					accessToken: null,
					refreshToken: null,
					isAuthenticated: false,
				}),
		}),
		{ name: "auth-storage" },
	),
);
