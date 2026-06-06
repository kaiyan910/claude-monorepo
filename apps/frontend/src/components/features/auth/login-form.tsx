import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-login";
import { errorKeyFromCode } from "@/i18n/error-message";
import { extractApiErrorCode } from "@/lib/api-error";
import { loginSchema } from "@/schemas/login.schemas";

/** First validation message for a field, tolerant of string or Zod-issue shapes. */
function firstError(errors: unknown[]): string | undefined {
	const first = errors[0];
	if (typeof first === "string") {
		return first;
	}
	if (first && typeof first === "object" && "message" in first) {
		return String((first as { message: unknown }).message);
	}
	return undefined;
}

/**
 * Username/password sign-in form. TanStack Form + Zod drive validation; the
 * useLogin mutation handles persistence + redirect. All copy is localized.
 */
export function LoginForm() {
	const { t } = useTranslation();
	const { mutate, isPending, isError, error } = useLogin();
	const [showPassword, setShowPassword] = useState(false);

	const form = useForm({
		defaultValues: { username: "", password: "" },
		validators: { onChange: loginSchema, onSubmit: loginSchema },
		onSubmit: ({ value }) => {
			mutate(value);
		},
	});

	return (
		<form
			noValidate
			className="flex flex-col gap-5"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			{isError ? (
				<p
					role="alert"
					aria-live="polite"
					className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					{t(errorKeyFromCode(extractApiErrorCode(error)))}
				</p>
			) : null}

			<form.Field name="username">
				{(field) => {
					const message = firstError(field.state.meta.errors);
					return (
						<div className="flex flex-col gap-2">
							<Label htmlFor="username">{t("login.usernameLabel")}</Label>
							<Input
								id="username"
								name={field.name}
								autoComplete="username"
								placeholder={t("login.usernamePlaceholder")}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={message ? true : undefined}
								aria-describedby={message ? "username-error" : undefined}
							/>
							{message ? (
								<p id="username-error" className="text-sm text-destructive">
									{t(message)}
								</p>
							) : null}
						</div>
					);
				}}
			</form.Field>

			<form.Field name="password">
				{(field) => {
					const message = firstError(field.state.meta.errors);
					return (
						<div className="flex flex-col gap-2">
							<Label htmlFor="password">{t("login.passwordLabel")}</Label>
							<div className="relative">
								<Input
									id="password"
									name={field.name}
									type={showPassword ? "text" : "password"}
									autoComplete="current-password"
									placeholder={t("login.passwordPlaceholder")}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									aria-invalid={message ? true : undefined}
									aria-describedby={message ? "password-error" : undefined}
									className="pr-11"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((shown) => !shown)}
									aria-label={t(
										showPassword ? "login.hidePassword" : "login.showPassword",
									)}
									className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
								>
									{showPassword ? (
										<EyeOff className="size-5" aria-hidden="true" />
									) : (
										<Eye className="size-5" aria-hidden="true" />
									)}
								</button>
							</div>
							{message ? (
								<p id="password-error" className="text-sm text-destructive">
									{t(message)}
								</p>
							) : null}
						</div>
					);
				}}
			</form.Field>

			<form.Subscribe selector={(state) => state.canSubmit}>
				{(canSubmit) => (
					<Button
						type="submit"
						disabled={!canSubmit || isPending}
						aria-busy={isPending || undefined}
						className="mt-1 w-full"
					>
						{isPending ? (
							<Loader2 className="size-4 animate-spin" aria-hidden="true" />
						) : null}
						{t(isPending ? "login.submitting" : "login.submit")}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
