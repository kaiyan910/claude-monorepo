import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/api/auth.api";
import { queryKeys } from "@/lib/query-client";

/** Fetches the authenticated user's profile for the protected home screen. */
export function useMe() {
	return useQuery({
		queryKey: queryKeys.auth.me,
		queryFn: ({ signal }) => getMe(signal),
	});
}
