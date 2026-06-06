import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { login } from "@/api/auth.api";
import type { LoginFormValues } from "@/schemas/login.schemas";
import { useAuthStore } from "@/store/auth.store";

/**
 * Sign-in mutation. On success it persists the token pair and redirects home;
 * callers read `isPending` / `isError` / `error` to drive the form UI.
 */
export function useLogin() {
	const setTokens = useAuthStore((state) => state.setTokens);
	const navigate = useNavigate();

	return useMutation({
		mutationFn: (credentials: LoginFormValues) => login(credentials),
		onSuccess: (tokens) => {
			setTokens(tokens);
			void navigate({ to: "/" });
		},
	});
}
