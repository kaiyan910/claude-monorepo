import { createFileRoute, redirect } from "@tanstack/react-router";
import { HomePage } from "@/components/features/home/home-page";
import { useAuthStore } from "@/store/auth.store";

export const Route = createFileRoute("/")({
	beforeLoad: () => {
		if (!useAuthStore.getState().isAuthenticated) {
			throw redirect({ to: "/login" });
		}
	},
	component: HomePage,
});
