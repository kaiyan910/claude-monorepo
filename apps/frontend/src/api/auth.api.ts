import { apiClient } from "@/lib/api-client";
import {
	type AuthResponse,
	authResponseSchema,
} from "@/dto/responses/auth-response.res";
import {
	type MeResponse,
	meResponseSchema,
} from "@/dto/responses/me-response.res";

type Credentials = {
	username: string;
	password: string;
};

/**
 * `POST /auth/login`. RQ v5 mutations receive no signal, so `signal` is
 * optional here; the response is validated before reaching callers.
 */
export async function login(
	credentials: Credentials,
	signal?: AbortSignal,
): Promise<AuthResponse> {
	const { data } = await apiClient.post("/auth/login", credentials, { signal });
	return authResponseSchema.parse(data);
}

/** `GET /auth/me`. Forwards the TanStack Query signal for auto-cancellation. */
export async function getMe(signal?: AbortSignal): Promise<MeResponse> {
	const { data } = await apiClient.get("/auth/me", { signal });
	return meResponseSchema.parse(data);
}
