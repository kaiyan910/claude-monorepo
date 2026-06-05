import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";

type RouterContext = {
	queryClient: QueryClient;
};

/**
 * Root route — renders the shared layout shell and the active page via
 * <Outlet />. All other routes nest beneath this one.
 */
export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
});

function RootLayout() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<Outlet />
			<TanStackRouterDevtools position="bottom-right" />
		</div>
	);
}
