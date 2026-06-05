import axios from "axios";
import { env } from "@/lib/env";

/**
 * Shared Axios instance pointing at the NestJS backend. Feature API modules
 * (`*.api.ts`) should import this rather than constructing their own client.
 */
export const apiClient = axios.create({
	baseURL: env.VITE_API_BASE_URL,
	headers: { "Content-Type": "application/json" },
});
