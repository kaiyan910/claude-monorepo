import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "@/app.module";
import {
	PASSWORD_HASHER,
	type PasswordHasher,
} from "@/auth/application/password-hasher";
import { CustomExceptionFilter } from "@/common/filters/custom-exception.filter";
import { DatabaseService } from "@/core/database/database.service";
import {
	USER_REPOSITORY,
	type UserRepository,
} from "@/user/application/user.repository";
import { User } from "@/user/domain/user.vo";

// no-op DatabaseService so app.init() never opens a real Postgres connection
const fakeDatabaseService = {
	getClient: () => ({}),
	onModuleInit: async () => {},
	onModuleDestroy: async () => {},
};

const ENABLED_USER = new User({
	id: "u1",
	name: "Root",
	username: "root",
	password: "stored-hash",
	email: "root@example.com",
	isRoot: true,
	enabled: true,
	createdAt: new Date("2026-06-05T00:00:00.000Z"),
	updatedAt: new Date("2026-06-05T00:00:00.000Z"),
});

const DISABLED_USER = new User({
	id: "u2",
	name: "Disabled",
	username: "disabled",
	password: "stored-hash",
	email: "disabled@example.com",
	isRoot: false,
	enabled: false,
	createdAt: new Date("2026-06-05T00:00:00.000Z"),
	updatedAt: new Date("2026-06-05T00:00:00.000Z"),
});

const fakeRepo: UserRepository = {
	findByUsername: async (username) => {
		if (username === "root") return ENABLED_USER;
		if (username === "disabled") return DISABLED_USER;
		return null;
	},
	findById: async (id) => {
		if (id === "u1") return ENABLED_USER;
		if (id === "u2") return DISABLED_USER;
		return null;
	},
};

// matches password "correct-password" against the stored hash
const fakeHasher: PasswordHasher = {
	compare: async (plain, hash) =>
		plain === "correct-password" && hash === "stored-hash",
};

describe("Auth (e2e)", () => {
	let app: INestApplication;

	beforeAll(async () => {
		process.env.ACCESS_TOKEN_SECRET = "e2e-access-secret";
		process.env.REFRESH_TOKEN_SECRET = "e2e-refresh-secret";
		process.env.ACCESS_TOKEN_TTL = "15m";
		process.env.REFRESH_TOKEN_TTL = "7d";

		const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(USER_REPOSITORY)
			.useValue(fakeRepo)
			.overrideProvider(PASSWORD_HASHER)
			.useValue(fakeHasher)
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
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	it("POST /auth/login returns a token pair for valid credentials", async () => {
		const res = await request(app.getHttpServer())
			.post("/auth/login")
			.send({ username: "root", password: "correct-password" })
			.expect(200);
		expect(res.body.accessToken).toEqual(expect.any(String));
		expect(res.body.refreshToken).toEqual(expect.any(String));
	});

	it("POST /auth/login returns 401 AUTH_INVALID_CREDENTIALS for a bad password", async () => {
		const res = await request(app.getHttpServer())
			.post("/auth/login")
			.send({ username: "root", password: "wrong" })
			.expect(401);
		expect(res.body.code).toBe("AUTH_INVALID_CREDENTIALS");
		expect(res.body.traceId).toEqual(expect.any(String));
	});

	it("POST /auth/login returns 400 VALIDATION_ERROR when fields are missing", async () => {
		const res = await request(app.getHttpServer())
			.post("/auth/login")
			.send({ username: "root" })
			.expect(400);
		expect(res.body.code).toBe("VALIDATION_ERROR");
		expect(res.body.traceId).toEqual(expect.any(String));
	});

	it("POST /auth/login returns 403 AUTH_USER_DISABLED for a disabled account", async () => {
		const res = await request(app.getHttpServer())
			.post("/auth/login")
			.send({ username: "disabled", password: "correct-password" })
			.expect(403);
		expect(res.body.code).toBe("AUTH_USER_DISABLED");
	});

	it("GET /auth/me returns the profile with a valid access token", async () => {
		const login = await request(app.getHttpServer())
			.post("/auth/login")
			.send({ username: "root", password: "correct-password" });

		const res = await request(app.getHttpServer())
			.get("/auth/me")
			.set("Authorization", `Bearer ${login.body.accessToken}`)
			.expect(200);
		expect(res.body).toMatchObject({
			username: "root",
			email: "root@example.com",
			isRoot: true,
		});
		expect(res.body).not.toHaveProperty("password");
	});

	it("GET /auth/me returns 401 AUTH_UNAUTHORIZED without a token", async () => {
		const res = await request(app.getHttpServer()).get("/auth/me").expect(401);
		expect(res.body.code).toBe("AUTH_UNAUTHORIZED");
	});

	it("POST /auth/refresh issues a new token pair from a valid refresh token", async () => {
		const login = await request(app.getHttpServer())
			.post("/auth/login")
			.send({ username: "root", password: "correct-password" });

		const res = await request(app.getHttpServer())
			.post("/auth/refresh")
			.send({ refreshToken: login.body.refreshToken })
			.expect(200);
		expect(res.body.accessToken).toEqual(expect.any(String));
		expect(res.body.refreshToken).toEqual(expect.any(String));
	});

	it("POST /auth/refresh returns 401 AUTH_INVALID_TOKEN for a bad token", async () => {
		const res = await request(app.getHttpServer())
			.post("/auth/refresh")
			.send({ refreshToken: "not-a-jwt" })
			.expect(401);
		expect(res.body.code).toBe("AUTH_INVALID_TOKEN");
	});
});
