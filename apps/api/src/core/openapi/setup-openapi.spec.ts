import type { INestApplication } from "@nestjs/common";

// @scalar/nestjs-api-reference pulls in an ESM-only transitive dep
// (@scalar/client-side-rendering, "type": "module") that ts-jest's CommonJS
// runtime cannot load. Mock it at the boundary so the module under test
// imports cleanly; the production no-op path asserted here never calls it.
jest.mock("@scalar/nestjs-api-reference", () => ({
	apiReference: jest.fn(
		() => (_req: unknown, _res: unknown, next: () => void) => next(),
	),
}));

import { setupOpenApi } from "@/core/openapi/setup-openapi";

describe("setupOpenApi", () => {
	const originalEnv = process.env.NODE_ENV;

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
	});

	it("is a no-op in production — registers no docs routes", async () => {
		process.env.NODE_ENV = "production";
		const get = jest.fn();
		const use = jest.fn();
		const fakeApp = {
			getHttpAdapter: () => ({ get }),
			use,
		} as unknown as INestApplication;

		await setupOpenApi(fakeApp);

		expect(get).not.toHaveBeenCalled();
		expect(use).not.toHaveBeenCalled();
	});
});
