import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { extractApiErrorCode } from "@/lib/api-error";

function axiosErrorWithData(data: unknown): AxiosError {
	const error = new AxiosError("Request failed");
	error.response = {
		data,
		status: 401,
		statusText: "Unauthorized",
		headers: {},
		config: { headers: new AxiosHeaders() },
	};
	return error;
}

describe("extractApiErrorCode", () => {
	it("returns the API code from a standard error body", () => {
		const error = axiosErrorWithData({
			httpCode: 401,
			code: "AUTH_INVALID_CREDENTIALS",
			message: "nope",
			traceId: "t-1",
			createdAt: "2026-06-06T00:00:00.000Z",
		});
		expect(extractApiErrorCode(error)).toBe("AUTH_INVALID_CREDENTIALS");
	});

	it("returns NETWORK_ERROR when there is no response", () => {
		expect(extractApiErrorCode(new AxiosError("Network Error"))).toBe(
			"NETWORK_ERROR",
		);
	});

	it("returns UNKNOWN for an unrecognized error body", () => {
		expect(extractApiErrorCode(axiosErrorWithData({ oops: true }))).toBe(
			"UNKNOWN",
		);
	});

	it("returns UNKNOWN for a non-axios error", () => {
		expect(extractApiErrorCode(new Error("boom"))).toBe("UNKNOWN");
	});
});
