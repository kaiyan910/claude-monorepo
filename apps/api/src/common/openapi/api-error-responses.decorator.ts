import { applyDecorators } from "@nestjs/common";
import { ApiExtraModels, ApiResponse } from "@nestjs/swagger";
import { ErrorResponseDto } from "@/common/openapi/error-response.dto";

/** One documented error outcome for an endpoint. */
export interface ApiErrorEntry {
	/** HTTP status code (e.g. 401). */
	status: number;
	/** Stable error `code` the frontend maps to user-facing text. */
	code: string;
	/** Human description shown in the reference UI. Defaults to `code`. */
	description?: string;
}

/**
 * Documents an endpoint's applicable error `code`s with the shared
 * ErrorResponseDto schema. Entries are grouped by HTTP status so multiple
 * codes under the same status (e.g. two 401s) become one response with named
 * examples — OpenAPI keys responses by status, so a second bare 401 would
 * otherwise overwrite the first.
 */
export function ApiErrorResponses(...entries: ApiErrorEntry[]) {
	const byStatus = new Map<number, ApiErrorEntry[]>();
	for (const entry of entries) {
		const group = byStatus.get(entry.status) ?? [];
		group.push(entry);
		byStatus.set(entry.status, group);
	}

	const responses = Array.from(byStatus.entries()).map(([status, group]) => {
		const examples = Object.fromEntries(
			group.map((entry) => [
				entry.code,
				{
					summary: entry.description ?? entry.code,
					value: {
						httpCode: status,
						code: entry.code,
						message: entry.description ?? entry.code,
						traceId: "87b9a4c3-6eaa-4553-aaee-5809729a13c3",
						createdAt: "2026-06-05T00:00:00.000Z",
					},
				},
			]),
		);
		return ApiResponse({
			status,
			description: group.map((entry) => entry.code).join(" | "),
			type: ErrorResponseDto,
			examples,
		});
	});

	return applyDecorators(ApiExtraModels(ErrorResponseDto), ...responses);
}
