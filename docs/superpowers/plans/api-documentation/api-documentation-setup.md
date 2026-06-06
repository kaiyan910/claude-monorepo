# API Documentation Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate the OpenAPI spec for `apps/api` with `@nestjs/swagger` and serve it through a **Scalar** reference UI (non-production only), with the existing `auth` feature fully decorated as the reference example.

**Architecture:** A `core/openapi/setup-openapi.ts` bootstrap (DocumentBuilder → `createDocument` → serve raw spec at `GET /openapi.json` → mount Scalar at `GET /reference`; no-op when `NODE_ENV === "production"`). A reusable `common/openapi/ErrorResponseDto` + `@ApiErrorResponses()` decorator documents each endpoint's error `code`s, **grouped by status code** so several codes can share one HTTP status via named examples. The two `type`-alias response DTOs become `@ApiProperty`-decorated classes so Swagger can introspect them.

**Tech Stack:** NestJS 11, TypeScript, `@nestjs/swagger`, `@scalar/nestjs-api-reference`, Jest + supertest, Biome.

**Reference docs:** [spec](../../specs/api-documentation/api-documentation-setup-design.md) · [api.md](../../../api.md) · [api-documentation.md](../../../api/api-documentation.md) · [error-handling.md](../../../api/error-handling.md) · [conventions.md](../../../api/conventions.md) · [testing.md](../../../api/testing.md)

**Conventions reminders:** kebab-case filenames with role suffixes; `@/` import alias (no `../` chains); no `any` (use `unknown`); `@ApiProperty` on every DTO field with an `example`; document every applicable error `code` per endpoint; tests co-located as `*.spec.ts`, e2e in `test/*.e2e-spec.ts`, Arrange→Act→Assert, one behaviour per `it()`. Run `npm run format` before each commit (repo uses tabs; Biome normalises).

---

## File Structure

**packages**
- `apps/api/package.json` — add `@nestjs/swagger` + `@scalar/nestjs-api-reference` deps (modify)

**common/openapi** (cross-feature shared error contract)
- `apps/api/src/common/openapi/error-response.dto.ts` — `ErrorResponseDto`, `@ApiProperty` mirror of the standard error response (create)
- `apps/api/src/common/openapi/api-error-responses.decorator.ts` — `@ApiErrorResponses(...entries)` grouping codes by status (create)
- `apps/api/src/common/openapi/api-error-responses.decorator.spec.ts` (create)

**core/openapi** (app-level bootstrap)
- `apps/api/src/core/openapi/setup-openapi.ts` — `setupOpenApi(app)` (create)
- `apps/api/src/core/openapi/setup-openapi.spec.ts` — production-guard no-op (create)

**auth presenter** (the reference example)
- `apps/api/src/auth/infrastructure/presenter/http/dto/auth-response.dto.ts` — `type` → decorated class (modify)
- `apps/api/src/auth/infrastructure/presenter/http/dto/me-response.dto.ts` — `type` → decorated class (modify)
- `apps/api/src/auth/infrastructure/presenter/http/dto/login.dto.ts` — add `@ApiProperty` (modify)
- `apps/api/src/auth/infrastructure/presenter/http/dto/refresh.dto.ts` — add `@ApiProperty` (modify)
- `apps/api/src/auth/infrastructure/presenter/http/auth.controller.ts` — add Swagger decorators + value imports (modify)

**wiring + e2e + docs**
- `apps/api/src/main.ts` — `await setupOpenApi(app)` after `useGlobalFilters` (modify)
- `apps/api/test/openapi.e2e-spec.ts` — full document/reference e2e (create)
- `apps/api/README.md` — note where docs live and how to document a new feature (modify)
- `docs/superpowers/specs/api-documentation/api-documentation-setup-design.md` — flip status to Implemented (modify)

---

## Task 1: Install Swagger + Scalar packages

**Files:**
- Modify: `apps/api/package.json` (dependencies)

- [ ] **Step 1: Install the two runtime deps into the api workspace**

Run:
```bash
npm install @nestjs/swagger @scalar/nestjs-api-reference -w @claude-monorepo/api
```
Expected: both packages added under `apps/api/package.json` `"dependencies"`, root `package-lock.json` updated.

- [ ] **Step 2: Verify the workspace still type-checks / builds**

Run:
```bash
npm run build -w @claude-monorepo/api
```
Expected: PASS (no errors — nothing imports the new packages yet).

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json package-lock.json
git commit -m "chore(api): add @nestjs/swagger and @scalar/nestjs-api-reference"
```

---

## Task 2: `ErrorResponseDto` + `@ApiErrorResponses()` decorator

The decorator groups entries by HTTP status, so endpoints that expose several error `code`s under the same status (e.g. `GET /auth/me` → two `401`s) render one response with multiple named examples instead of silently overwriting.

**Files:**
- Create: `apps/api/src/common/openapi/error-response.dto.ts`
- Create: `apps/api/src/common/openapi/api-error-responses.decorator.ts`
- Test: `apps/api/src/common/openapi/api-error-responses.decorator.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/common/openapi/api-error-responses.decorator.spec.ts`:
```typescript
import { Controller, Get } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { ApiErrorResponses } from "@/common/openapi/api-error-responses.decorator";

@Controller("things")
class ThingsTestController {
	@Get()
	@ApiErrorResponses(
		{ status: 401, code: "AUTH_UNAUTHORIZED" },
		{ status: 401, code: "AUTH_INVALID_TOKEN" },
		{ status: 404, code: "NOT_FOUND" },
	)
	findAll(): string[] {
		return [];
	}
}

describe("ApiErrorResponses", () => {
	it("groups codes that share a status into one response with named examples", async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [ThingsTestController],
		}).compile();
		const app = moduleRef.createNestApplication();

		const document = SwaggerModule.createDocument(
			app,
			new DocumentBuilder().build(),
		);

		const operation = document.paths["/things"].get as {
			responses: Record<
				string,
				{ content?: Record<string, { examples?: Record<string, unknown> }> }
			>;
		};
		const examples =
			operation.responses["401"].content?.["application/json"].examples ?? {};
		expect(Object.keys(examples)).toEqual([
			"AUTH_UNAUTHORIZED",
			"AUTH_INVALID_TOKEN",
		]);
		expect(operation.responses["404"]).toBeDefined();
		expect(document.components?.schemas?.ErrorResponseDto).toBeDefined();

		await app.close();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -w @claude-monorepo/api -- api-error-responses.decorator`
Expected: FAIL — cannot find module `@/common/openapi/api-error-responses.decorator`.

- [ ] **Step 3: Create `ErrorResponseDto`**

Create `apps/api/src/common/openapi/error-response.dto.ts`:
```typescript
import { ApiProperty } from "@nestjs/swagger";

/**
 * Schema mirror of the Standard Error Response emitted by
 * CustomExceptionFilter. Lets Swagger give error responses a real schema.
 */
export class ErrorResponseDto {
	@ApiProperty({ example: 401, description: "HTTP status code." })
	httpCode!: number;

	@ApiProperty({
		example: "AUTH_INVALID_CREDENTIALS",
		description: "Stable error code the frontend maps to user-facing text.",
	})
	code!: string;

	@ApiProperty({ example: "Invalid username or password" })
	message!: string;

	@ApiProperty({ example: "87b9a4c3-6eaa-4553-aaee-5809729a13c3" })
	traceId!: string;

	@ApiProperty({ example: "2026-06-05T00:00:00.000Z" })
	createdAt!: string;
}
```

- [ ] **Step 4: Create the `@ApiErrorResponses()` decorator**

Create `apps/api/src/common/openapi/api-error-responses.decorator.ts`:
```typescript
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test -w @claude-monorepo/api -- api-error-responses.decorator`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
npm run format
git add apps/api/src/common/openapi
git commit -m "feat(api): add reusable ErrorResponseDto and @ApiErrorResponses decorator"
```

---

## Task 3: `setupOpenApi()` bootstrap (production guard tested)

**Files:**
- Create: `apps/api/src/core/openapi/setup-openapi.ts`
- Test: `apps/api/src/core/openapi/setup-openapi.spec.ts`

- [ ] **Step 1: Write the failing test (production no-op)**

Create `apps/api/src/core/openapi/setup-openapi.spec.ts`:
```typescript
import type { INestApplication } from "@nestjs/common";
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -w @claude-monorepo/api -- setup-openapi`
Expected: FAIL — cannot find module `@/core/openapi/setup-openapi`.

- [ ] **Step 3: Create `setup-openapi.ts`**

Create `apps/api/src/core/openapi/setup-openapi.ts`:
```typescript
import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import type { Request, Response } from "express";

/**
 * Wires the OpenAPI document and its Scalar reference UI onto the app.
 *
 * Non-production only: when NODE_ENV is "production" this returns immediately,
 * so neither the raw spec nor the reference UI is ever exposed in prod. The two
 * routes it adds (`GET /openapi.json`, `GET /reference`) are registered on the
 * raw HTTP adapter / via `app.use`, outside the Nest controller pipeline — the
 * global ValidationPipe and CustomExceptionFilter never touch them.
 */
export async function setupOpenApi(app: INestApplication): Promise<void> {
	if (process.env.NODE_ENV === "production") {
		return;
	}

	const config = new DocumentBuilder()
		.setTitle("Claude Monorepo API")
		.setDescription("HTTP API for the claude-monorepo backend service.")
		.setVersion("0.0.1")
		.addBearerAuth()
		.addTag("auth", "Authentication endpoints")
		.build();

	const document = SwaggerModule.createDocument(app, config);

	const httpAdapter = app.getHttpAdapter();
	httpAdapter.get("/openapi.json", (_req: Request, res: Response) => {
		res.json(document);
	});

	app.use("/reference", apiReference({ url: "/openapi.json" }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -w @claude-monorepo/api -- setup-openapi`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run format
git add apps/api/src/core/openapi
git commit -m "feat(api): add setupOpenApi bootstrap with production guard"
```

---

## Task 4: Convert response DTOs to classes + add `@ApiProperty` to request DTOs

Response DTOs are currently `type` aliases Swagger cannot introspect. Converting to `implements`-the-same-interface classes keeps them structurally identical to the service return values (`TokenPair` / `UserProfile`), so no service changes are needed. The controller still imports them as types here (changed to value imports in Task 5), so the build stays green.

**Files:**
- Modify: `apps/api/src/auth/infrastructure/presenter/http/dto/auth-response.dto.ts`
- Modify: `apps/api/src/auth/infrastructure/presenter/http/dto/me-response.dto.ts`
- Modify: `apps/api/src/auth/infrastructure/presenter/http/dto/login.dto.ts`
- Modify: `apps/api/src/auth/infrastructure/presenter/http/dto/refresh.dto.ts`

- [ ] **Step 1: Convert `auth-response.dto.ts` to a decorated class**

Replace the entire file `apps/api/src/auth/infrastructure/presenter/http/dto/auth-response.dto.ts` with:
```typescript
import { ApiProperty } from "@nestjs/swagger";
import type { TokenPair } from "@/auth/application/token.service";

/** Response body for login and refresh — the issued JWT pair. */
export class AuthResponseDto implements TokenPair {
	@ApiProperty({
		description: "Short-lived JWT for authenticating API requests.",
		example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.sig",
	})
	accessToken!: string;

	@ApiProperty({
		description: "Long-lived JWT used to obtain a new token pair.",
		example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.sig",
	})
	refreshToken!: string;
}
```

- [ ] **Step 2: Convert `me-response.dto.ts` to a decorated class**

Replace the entire file `apps/api/src/auth/infrastructure/presenter/http/dto/me-response.dto.ts` with:
```typescript
import { ApiProperty } from "@nestjs/swagger";
import type { UserProfile } from "@/user/domain/user.vo";

/** Response body for GET /auth/me (password-free user profile). */
export class MeResponseDto implements UserProfile {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id!: string;

	@ApiProperty({ example: "Root" })
	name!: string;

	@ApiProperty({ example: "root" })
	username!: string;

	@ApiProperty({ example: "root@example.com" })
	email!: string;

	@ApiProperty({ description: "Whether the user has root privileges.", example: true })
	isRoot!: boolean;

	@ApiProperty({ description: "Whether the account is active.", example: true })
	enabled!: boolean;

	@ApiProperty({
		type: String,
		format: "date-time",
		example: "2026-06-05T00:00:00.000Z",
	})
	createdAt!: Date;

	@ApiProperty({
		type: String,
		format: "date-time",
		example: "2026-06-05T00:00:00.000Z",
	})
	updatedAt!: Date;
}
```

- [ ] **Step 3: Add `@ApiProperty` to `login.dto.ts`**

Replace the entire file `apps/api/src/auth/infrastructure/presenter/http/dto/login.dto.ts` with:
```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/** Login request body. Shape-only validation per validation.md. */
export class LoginDto {
	@ApiProperty({ example: "root", description: "Account username." })
	@IsString()
	@IsNotEmpty()
	username!: string;

	@ApiProperty({ example: "correct-horse-battery-staple", description: "Account password." })
	@IsString()
	@IsNotEmpty()
	password!: string;
}
```

- [ ] **Step 4: Add `@ApiProperty` to `refresh.dto.ts`**

Replace the entire file `apps/api/src/auth/infrastructure/presenter/http/dto/refresh.dto.ts` with:
```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/** Refresh request body. */
export class RefreshDto {
	@ApiProperty({
		description: "A valid refresh token previously issued by login or refresh.",
		example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.sig",
	})
	@IsString()
	@IsNotEmpty()
	refreshToken!: string;
}
```

- [ ] **Step 5: Verify the existing auth tests + build still pass**

Run: `npm run test -w @claude-monorepo/api -- auth.controller && npm run build -w @claude-monorepo/api`
Expected: PASS — DTO classes are structurally identical to the old aliases; controller (still using `import type`) compiles unchanged.

- [ ] **Step 6: Commit**

```bash
npm run format
git add apps/api/src/auth/infrastructure/presenter/http/dto
git commit -m "refactor(api): make auth DTOs Swagger-introspectable classes"
```

---

## Task 5: Decorate `AuthController`

**Files:**
- Modify: `apps/api/src/auth/infrastructure/presenter/http/auth.controller.ts`

- [ ] **Step 1: Replace the controller with the decorated version**

Replace the entire file `apps/api/src/auth/infrastructure/presenter/http/auth.controller.ts` with (note: response DTO imports change from `import type` to value imports — decorators reference the classes at runtime):
```typescript
import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Req,
	UseGuards,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService } from "@/auth/application/auth.service";
import { AuthResponseDto } from "@/auth/infrastructure/presenter/http/dto/auth-response.dto";
import { LoginDto } from "@/auth/infrastructure/presenter/http/dto/login.dto";
import { MeResponseDto } from "@/auth/infrastructure/presenter/http/dto/me-response.dto";
import { RefreshDto } from "@/auth/infrastructure/presenter/http/dto/refresh.dto";
import {
	type AuthenticatedUser,
	JwtAuthGuard,
} from "@/common/guards/jwt-auth.guard";
import { ApiErrorResponses } from "@/common/openapi/api-error-responses.decorator";

/**
 * HTTP presenter for the auth feature. Delegates all business logic to AuthService.
 * No try/catch — errors propagate to CustomExceptionFilter. Swagger decorators
 * document the success shape and every applicable error `code` per endpoint.
 */
@ApiTags("auth")
@Controller("auth")
export class AuthController {
	constructor(private readonly auth: AuthService) {}

	@Post("login")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: "Authenticate with username and password" })
	@ApiOkResponse({ type: AuthResponseDto, description: "Issued JWT pair." })
	@ApiErrorResponses(
		{ status: 400, code: "VALIDATION_ERROR", description: "Request body failed shape validation." },
		{ status: 401, code: "AUTH_INVALID_CREDENTIALS", description: "Username/password did not match." },
		{ status: 403, code: "AUTH_USER_DISABLED", description: "Account is disabled." },
	)
	login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
		return this.auth.login(dto.username, dto.password);
	}

	@Post("refresh")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: "Exchange a refresh token for a new token pair" })
	@ApiOkResponse({ type: AuthResponseDto, description: "Issued JWT pair." })
	@ApiErrorResponses(
		{ status: 400, code: "VALIDATION_ERROR", description: "Request body failed shape validation." },
		{ status: 401, code: "AUTH_INVALID_TOKEN", description: "Refresh token is invalid or expired." },
		{ status: 403, code: "AUTH_USER_DISABLED", description: "Account is disabled." },
	)
	refresh(@Body() dto: RefreshDto): Promise<AuthResponseDto> {
		return this.auth.refresh(dto.refreshToken);
	}

	@Get("me")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Return the authenticated user's profile" })
	@ApiOkResponse({ type: MeResponseDto, description: "The authenticated user's profile." })
	@ApiErrorResponses(
		{ status: 401, code: "AUTH_UNAUTHORIZED", description: "Missing or malformed Authorization header." },
		{ status: 401, code: "AUTH_INVALID_TOKEN", description: "Access token is invalid or expired." },
	)
	me(
		@Req() req: Request & { user: AuthenticatedUser },
	): Promise<MeResponseDto> {
		return this.auth.getProfile(req.user.userId);
	}
}
```

- [ ] **Step 2: Verify existing auth controller + e2e tests still pass**

Run: `npm run test -w @claude-monorepo/api -- auth.controller && npm run test:e2e -w @claude-monorepo/api -- auth`
Expected: PASS — decorators are metadata only; runtime behaviour is unchanged.

- [ ] **Step 3: Commit**

```bash
npm run format
git add apps/api/src/auth/infrastructure/presenter/http/auth.controller.ts
git commit -m "docs(api): annotate AuthController with OpenAPI decorators"
```

---

## Task 6: Wire `setupOpenApi` into `main.ts`

**Files:**
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Add the `setupOpenApi` call**

Replace the entire file `apps/api/src/main.ts` with:
```typescript
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "@/app.module";
import { CustomExceptionFilter } from "@/common/filters/custom-exception.filter";
import { setupOpenApi } from "@/core/openapi/setup-openapi";

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);
	app.useGlobalFilters(new CustomExceptionFilter());
	await setupOpenApi(app);
	await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
```

- [ ] **Step 2: Verify the build passes**

Run: `npm run build -w @claude-monorepo/api`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
npm run format
git add apps/api/src/main.ts
git commit -m "feat(api): mount OpenAPI docs during bootstrap"
```

---

## Task 7: OpenAPI document e2e test

**Files:**
- Create: `apps/api/test/openapi.e2e-spec.ts`

- [ ] **Step 1: Write the e2e test**

> **Scalar under Jest:** `@scalar/nestjs-api-reference` depends on an ESM-only package (`@scalar/client-side-rendering`, `"type": "module"`) that ts-jest's CommonJS runtime cannot load. The non-production path of `setupOpenApi` calls it for real, so the e2e mocks it with an HTML-returning stub. The `/openapi.json` assertions (the bulk of the value) remain fully real — they exercise real Swagger introspection of the decorated controllers. The `/reference` case honestly verifies that the route is mounted and returns HTML; the real Scalar renderer runs only at runtime (Node 24 `require`), not under Jest.

Create `apps/api/test/openapi.e2e-spec.ts`:
```typescript
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

// See note above: stub the ESM-only Scalar middleware so ts-jest can load it.
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
```

- [ ] **Step 2: Run the e2e test**

Run: `npm run test:e2e -w @claude-monorepo/api -- openapi`
Expected: PASS (all 5 cases).

- [ ] **Step 3: Run the full e2e suite to confirm no regressions**

Run: `npm run test:e2e -w @claude-monorepo/api`
Expected: PASS (auth + openapi).

- [ ] **Step 4: Commit**

```bash
npm run format
git add apps/api/test/openapi.e2e-spec.ts
git commit -m "test(api): add OpenAPI document and Scalar reference e2e coverage"
```

---

## Task 8: README + spec status

**Files:**
- Modify: `apps/api/README.md`
- Modify: `docs/superpowers/specs/api-documentation/api-documentation-setup-design.md`

- [ ] **Step 1: Add an API docs section to `apps/api/README.md`**

Append the following section to `apps/api/README.md`:
```markdown
## API Documentation

OpenAPI docs are generated from the controllers/DTOs and served **in
non-production only** (`NODE_ENV !== "production"`):

- **`GET /reference`** — interactive Scalar API reference UI.
- **`GET /openapi.json`** — the raw OpenAPI 3 spec (for external tooling).

To document a new feature, follow the `auth` example:

1. Decorate the controller class with `@ApiTags("<feature>")`.
2. On each handler add `@ApiOperation({ summary })`, an `@ApiOkResponse({ type })`
   (or other success decorator), and `@ApiErrorResponses(...)` listing every
   applicable error `code`. Add `@ApiBearerAuth()` to guarded routes.
3. Make response bodies `@ApiProperty`-decorated classes (not `type` aliases) so
   Swagger can introspect them; add `@ApiProperty({ example })` to request DTOs.

`@ApiErrorResponses` (in `src/common/openapi/`) groups codes by HTTP status, so
several codes under one status render as named examples.
```

- [ ] **Step 2: Flip the spec status to Implemented**

In `docs/superpowers/specs/api-documentation/api-documentation-setup-design.md`, change the status line:
```markdown
**Status:** Approved (pending implementation)
```
to:
```markdown
**Status:** Implemented
```

- [ ] **Step 3: Final verification — full test suite + Biome check**

Run:
```bash
npm run test -w @claude-monorepo/api && npm run test:e2e -w @claude-monorepo/api && npm run check
```
Expected: all unit tests PASS, all e2e PASS, Biome `check` reports no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/README.md docs/superpowers/specs/api-documentation/api-documentation-setup-design.md
git commit -m "docs(api): document OpenAPI reference setup and mark spec implemented"
```

---

## Self-Review

**Spec coverage:**
- Install `@nestjs/swagger` + `@scalar/nestjs-api-reference` → Task 1.
- `setupOpenApi(app)` (DocumentBuilder, createDocument, serve `/openapi.json`, mount Scalar) → Task 3 + Task 6.
- Reusable `ErrorResponseDto` + `@ApiErrorResponses()` → Task 2.
- Convert `AuthResponseDto`/`MeResponseDto`; `@ApiProperty` on `LoginDto`/`RefreshDto` → Task 4.
- Decorate `AuthController` (`@ApiTags`/`@ApiOperation`/`@ApiOkResponse`/`@ApiBearerAuth`/`@ApiErrorResponses`, all error codes) → Task 5.
- Tests: openapi e2e (Task 7), production-guard unit (Task 3), error-decorator unit (Task 2).
- `apps/api/README.md` note → Task 8.
- Non-production gating → Task 3 (guard) + Task 7 (asserted indirectly via the unit test in Task 3).

**Deviation from spec (improvement):** the spec's `@ApiErrorResponses` sketch emitted one `ApiResponse` per entry, which would make the two `401`s on `GET /auth/me` collide (OpenAPI keys responses by status). This plan groups entries by status and emits named examples instead — same documented information, valid OpenAPI. The error-code tables and per-endpoint coverage are otherwise identical to the spec.

**Type consistency:** `ApiErrorEntry { status, code, description? }` is defined in Task 2 and used identically in Task 5. `setupOpenApi(app: INestApplication): Promise<void>` is defined in Task 3 and called the same way in Task 6 and Task 7. `AuthResponseDto`/`MeResponseDto` implement `TokenPair`/`UserProfile` (Task 4), matching the service return types referenced by the controller (Task 5).

**Placeholder scan:** none — every code/test/command step contains complete content.
