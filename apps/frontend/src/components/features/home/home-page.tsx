import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { useAuthStore } from "@/store/auth.store";

/**
 * Protected home. Greets the signed-in user (via GET /auth/me) and offers a
 * logout action. The index route guard redirects here only when authenticated.
 */
export function HomePage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const clear = useAuthStore((state) => state.clear);
	const { data: user, isLoading } = useMe();

	function handleLogout() {
		clear();
		void navigate({ to: "/login" });
	}

	return (
		<main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
			<h1 className="font-bold text-4xl tracking-tight">{t("home.appName")}</h1>
			<p className="text-muted-foreground">
				{isLoading
					? t("home.loading")
					: t("home.greeting", { name: user?.name ?? "" })}
			</p>
			<Button variant="outline" onClick={handleLogout}>
				{t("home.logout")}
			</Button>
		</main>
	);
}
