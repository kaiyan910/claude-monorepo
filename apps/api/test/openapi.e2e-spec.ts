import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

// @scalar/nestjs-api-reference depends on an ESM-only package
// (@scalar/client-side-rendering, "type": "module") that ts-jest's CommonJS
// runtime cannot load. Stub it with a middleware that returns minimal HTML so
// the /reference wiring is exercised; the real renderer runs only at runtime.
jest.mock("@scalar/nestjs-api-reference", () => ({
	apiReference:
		() =>
		(
			_req: unknown,
			res: {
				setHeader: (key: string, value: string) => void;
				end: (body: string) => void;
			},
		) => {
			res.setHeader("Content-Type", "text/html");
			res.end("<!doctype html><title>API Reference</title>");
		},
}));

import { AppModule } from "@/app.module";
import { CustomExceptionFilter } from "@/common/filters/custom-exception.filter";
import { DatabaseService } from "@/core/database/database.service";
import { setupOpenApi } from "@/core/openapi/setup-openapi";

// no-op DatabaseService so app.init() never opens a real Postgres connection
const fakeDatabaseService = {
	getClient: () => ({}),
	onModuleInit: async () => {},
	onModuleDestroy: async () => {},
};

/** Minimal shape of the generated document that these tests inspect. */
interface OpenApiResponse {
	content?: Record<string, { examples?: Record<string, unknown> }>;
}
interface OpenApiOperation {
	responses: Record<string, OpenApiResponse>;
}
interface OpenApiDocument {
	paths: Record<string, Record<string, OpenApiOperation>>;
	components: { securitySchemes?: Record<string, unknown> };
}

describe("OpenAPI docs (e2e)", () => {
	let app: INestApplication;
	let document: OpenApiDocument;
	let originalNodeEnv: string | undefined;

	beforeAll(async () => {
		originalNodeEnv = process.env.NODE_ENV;
		// Non-production so setupOpenApi registers the docs routes (no-op in prod).
		process.env.NODE_ENV = "test";
		process.env.ACCESS_TOKEN_SECRET = "e2e-access-secret";
		process.env.REFRESH_TOKEN_SECRET = "e2e-refresh-secret";
		process.env.ACCESS_TOKEN_TTL = "15m";
		process.env.REFRESH_TOKEN_TTL = "7d";

		const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(DatabaseService)
			.useValue(fakeDatabaseService)
			.compile();

		app = moduleRef.createNestApplication();
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				forbidNonWhitelisted: true,
				transform: true,
			}),
		);
		app.useGlobalFilters(new CustomExceptionFilter());
		await setupOpenApi(app);
		await app.init();

		// The document is invariant for the whole suite — fetch it once.
		const res = await request(app.getHttpServer())
			.get("/openapi.json")
			.expect(200);
		document = res.body;
	});

	afterAll(async () => {
		process.env.NODE_ENV = originalNodeEnv;
		await app.close();
	});

	it("documents the auth endpoints", () => {
		expect(document.paths).toHaveProperty("/auth/login");
		expect(document.paths).toHaveProperty("/auth/refresh");
		expect(document.paths).toHaveProperty("/auth/me");
	});

	it("defines the bearer security scheme", () => {
		expect(document.components.securitySchemes).toHaveProperty("bearer");
	});

	it("documents the login error codes with named examples", () => {
		const login = document.paths["/auth/login"].post;
		expect(login.responses).toHaveProperty("400");
		expect(login.responses).toHaveProperty("401");
		expect(login.responses).toHaveProperty("403");
		const examples =
			login.responses["401"].content?.["application/json"]?.examples;
		expect(examples).toBeDefined();
		expect(examples).toHaveProperty("AUTH_INVALID_CREDENTIALS");
	});

	it("groups both 401 codes for GET /auth/me under one response", () => {
		const examples =
			document.paths["/auth/me"].get.responses["401"].content?.[
				"application/json"
			]?.examples;
		expect(examples).toBeDefined();
		expect(Object.keys(examples ?? {})).toEqual(
			expect.arrayContaining(["AUTH_UNAUTHORIZED", "AUTH_INVALID_TOKEN"]),
		);
	});

	it("mounts GET /reference and responds with HTML", async () => {
		const res = await request(app.getHttpServer())
			.get("/reference")
			.expect(200);
		expect(res.headers["content-type"]).toContain("text/html");
	});
});
