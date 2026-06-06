import { buildCorsOptions } from "@/config/cors";

describe("buildCorsOptions", () => {
	it("falls back to the Vite dev origin when CORS_ORIGIN is unset", () => {
		const options = buildCorsOptions({});
		expect(options.origin).toEqual(["http://localhost:5173"]);
	});

	it("falls back to the Vite dev origin when CORS_ORIGIN is empty", () => {
		const options = buildCorsOptions({ CORS_ORIGIN: "" });
		expect(options.origin).toEqual(["http://localhost:5173"]);
	});

	it("parses a single origin", () => {
		const options = buildCorsOptions({
			CORS_ORIGIN: "https://app.example.com",
		});
		expect(options.origin).toEqual(["https://app.example.com"]);
	});

	it("parses a comma-separated list and trims whitespace", () => {
		const options = buildCorsOptions({
			CORS_ORIGIN: " https://a.com , https://b.com ",
		});
		expect(options.origin).toEqual(["https://a.com", "https://b.com"]);
	});

	it("filters out empty entries", () => {
		const options = buildCorsOptions({
			CORS_ORIGIN: "https://a.com,,https://b.com",
		});
		expect(options.origin).toEqual(["https://a.com", "https://b.com"]);
	});

	it("disables credentials", () => {
		const options = buildCorsOptions({});
		expect(options.credentials).toBe(false);
	});
});
