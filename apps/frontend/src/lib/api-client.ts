import axios from "axios";
import { env } from "@/lib/env";
import { useAuthStore } from "@/store/auth.store";

/**
 * Shared Axios instance pointing at the NestJS backend. Feature API modules
 * (`*.api.ts`) should import this rather than constructing their own client.
 */
export const apiClient = axios.create({
	baseURL: env.VITE_API_BASE_URL,
	headers: { "Content-Type": "application/json" },
});

// Attach the current access token to every request. Reads the store
// imperatively so non-React callers (route guards, api modules) stay in sync.
apiClient.interceptors.request.use((config) => {
	const token = useAuthStore.getState().accessToken;
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});
