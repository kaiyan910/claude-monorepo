import { createRouter } from "@tanstack/react-router";
import { queryClient } from "@/lib/query-client";
import { routeTree } from "@/routeTree.gen";

/**
 * Application router. The generated `routeTree` comes from the files under
 * `src/routes/`; `queryClient` is injected into router context so route
 * loaders can prefetch queries.
 */
export const router = createRouter({
	routeTree,
	context: { queryClient },
	defaultPreload: "intent",
	scrollRestoration: true,
});

// Register the router instance for full type-safety across the app.
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
