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

describe("OpenAPI docs (e2e)", () => {
	let app: INestApplication;

	beforeAll(async () => {
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
	});

	afterAll(async () => {
		await app.close();
	});

	it("GET /openapi.json documents the auth endpoints", async () => {
		const res = await request(app.getHttpServer())
			.get("/openapi.json")
			.expect(200);
		expect(res.body.paths).toHaveProperty("/auth/login");
		expect(res.body.paths).toHaveProperty("/auth/refresh");
		expect(res.body.paths).toHaveProperty("/auth/me");
	});

	it("GET /openapi.json defines the bearer security scheme", async () => {
		const res = await request(app.getHttpServer())
			.get("/openapi.json")
			.expect(200);
		expect(res.body.components.securitySchemes).toHaveProperty("bearer");
	});

	it("documents the login error codes with named examples", async () => {
		const res = await request(app.getHttpServer())
			.get("/openapi.json")
			.expect(200);
		const login = res.body.paths["/auth/login"].post;
		expect(login.responses).toHaveProperty("400");
		expect(login.responses).toHaveProperty("401");
		expect(login.responses).toHaveProperty("403");
		expect(
			login.responses["401"].content["application/json"].examples,
		).toHaveProperty("AUTH_INVALID_CREDENTIALS");
	});

	it("documents both 401 codes for GET /auth/me under one response", async () => {
		const res = await request(app.getHttpServer())
			.get("/openapi.json")
			.expect(200);
		const examples =
			res.body.paths["/auth/me"].get.responses["401"].content[
				"application/json"
			].examples;
		expect(Object.keys(examples)).toEqual(
			expect.arrayContaining(["AUTH_UNAUTHORIZED", "AUTH_INVALID_TOKEN"]),
		);
	});

	it("GET /reference is mounted and returns HTML", async () => {
		const res = await request(app.getHttpServer())
			.get("/reference")
			.expect(200);
		expect(res.headers["content-type"]).toContain("text/html");
	});
});
