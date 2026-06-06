import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LoginForm } from "@/components/features/auth/login-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

/**
 * Split-view login screen: navy brand panel (desktop) + centered card form.
 * Collapses to a single centered column on small screens.
 */
export function LoginPage() {
	const { t } = useTranslation();

	return (
		<div className="grid min-h-dvh lg:grid-cols-2">
			<aside className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
				<div className="flex items-center gap-2 font-semibold text-lg">
					<ShieldCheck className="size-6" aria-hidden="true" />
					<span>{t("login.brandName")}</span>
				</div>
				<p className="max-w-sm text-2xl font-semibold leading-snug text-balance">
					{t("login.brandTagline")}
				</p>
				<span className="text-sm text-primary-foreground/70">
					{t("login.copyright")}
				</span>
			</aside>

			<main className="flex items-center justify-center p-6">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>{t("login.title")}</CardTitle>
						<CardDescription>{t("login.subtitle")}</CardDescription>
					</CardHeader>
					<CardContent>
						<LoginForm />
					</CardContent>
				</Card>
			</main>
		</div>
	);
}
