import axios from "axios";
import { apiErrorSchema } from "@/dto/responses/api-error.res";

/**
 * Normalizes any thrown value into a stable error `code` the UI can translate.
 * Prefers the backend's standard error envelope; falls back to NETWORK_ERROR
 * (no response) or UNKNOWN. The UI maps this code to copy — never the raw
 * message — per the API error-handling contract.
 */
export function extractApiErrorCode(error: unknown): string {
	if (axios.isAxiosError(error)) {
		const parsed = apiErrorSchema.safeParse(error.response?.data);
		if (parsed.success) {
			return parsed.data.code;
		}
		if (!error.response) {
			return "NETWORK_ERROR";
		}
	}
	return "UNKNOWN";
}
