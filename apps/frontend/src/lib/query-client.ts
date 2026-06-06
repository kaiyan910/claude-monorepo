import { QueryClient } from "@tanstack/react-query";

/** App-wide TanStack Query client with conservative defaults. */
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60_000,
			retry: 1,
			refetchOnWindowFocus: false,
		},
	},
});

/**
 * Centralized query keys. Custom hooks must reference these instead of
 * hard-coding key arrays inline, so cache invalidation stays consistent.
 */
export const queryKeys = {
	auth: {
		me: ["auth", "me"] as const,
	},
} as const;
