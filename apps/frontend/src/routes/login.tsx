import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginPage } from "@/components/features/auth/login-page";
import { useAuthStore } from "@/store/auth.store";

export const Route = createFileRoute("/login")({
	beforeLoad: () => {
		if (useAuthStore.getState().isAuthenticated) {
			throw redirect({ to: "/" });
		}
	},
	component: LoginPage,
});
