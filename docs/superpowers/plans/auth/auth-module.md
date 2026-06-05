# Auth Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stateless-JWT auth module for `apps/api` (`POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`) plus the minimal backend foundation it needs, fully compliant with `docs/api.md`.

**Architecture:** DDD layering per `docs/api.md`. Two features — `user` (owns the user domain, exposes a `UserRepository` port backed by Prisma) and `auth` (orchestrates login/refresh/me through `UserRepository`, `TokenService`, and `PasswordHasher` ports). Stateless signed JWTs (separate access/refresh secrets), tokens returned in the response body, Bearer auth via a custom `JwtAuthGuard`. Cross-cutting `core/database`, `common/errors`, `common/filters`, `common/middleware`.

**Tech Stack:** NestJS 11, TypeScript, Prisma 7 + `@prisma/adapter-pg`, PostgreSQL, `@nestjs/jwt`, `@nestjs/config`, `bcrypt`, `class-validator`/`class-transformer`, Jest + supertest, Biome.

**Reference docs:** [spec](../../specs/auth/auth-module-design.md) · [api.md](../../../api.md) · [database.md](../../../api/database.md) · [error-handling.md](../../../api/error-handling.md) · [validation.md](../../../api/validation.md) · [conventions.md](../../../api/conventions.md) · [testing.md](../../../api/testing.md)

**Conventions reminders:** kebab-case filenames with role suffixes; `@/` import alias (no `../` chains); no `any`; custom `HttpException` subclasses only (never bare `throw new Error`); controllers contain no `try/catch`; tests co-located as `*.spec.ts`, Arrange→Act→Assert, one behaviour per `it()`, mock at the boundary.

---

## File Structure

**Foundation / tooling**
- `apps/api/package.json` — add deps + `db:*` scripts + jest `moduleNameMapper` (modify)
- `apps/api/tsconfig.json` — add `baseUrl` + `@/*` paths (modify)
- `apps/api/.env.example` — documented env template (create)
- `apps/api/prisma/schema.prisma` — `User` model (create)
- `apps/api/prisma/seed.ts` — root-user seed (create)
- `apps/api/src/config/env.ts` — typed env accessor helpers (create)

**core**
- `apps/api/src/core/database/database.service.ts` — Prisma client via `PrismaPg` adapter (create)
- `apps/api/src/core/database/database.module.ts` (create)

**common**
- `apps/api/src/common/errors/*.error.ts` — custom `HttpException` subclasses (create)
- `apps/api/src/common/filters/custom-exception.filter.ts` (create)
- `apps/api/src/common/middleware/request-id.middleware.ts` (create)
- `apps/api/src/common/guards/jwt-auth.guard.ts` (create)

**user feature**
- `apps/api/src/user/domain/user.vo.ts` — `User` domain object + `UserProfile` (create)
- `apps/api/src/user/application/user.repository.ts` — port + `USER_REPOSITORY` token (create)
- `apps/api/src/user/infrastructure/persistence/user.mapper.ts` (create)
- `apps/api/src/user/infrastructure/persistence/prisma-user.repository.ts` (create)
- `apps/api/src/user/infrastructure/user-infrastructure.module.ts` (create)
- `apps/api/src/user/application/user.module.ts` (create)

**auth feature**
- `apps/api/src/auth/application/token.service.ts` — `TokenService` port + payload types + `TOKEN_SERVICE` (create)
- `apps/api/src/auth/application/password-hasher.ts` — `PasswordHasher` port + `PASSWORD_HASHER` (create)
- `apps/api/src/auth/application/auth.service.ts` (create)
- `apps/api/src/auth/application/auth.module.ts` (create)
- `apps/api/src/auth/infrastructure/jwt-token.service.ts` (create)
- `apps/api/src/auth/infrastructure/bcrypt-password-hasher.ts` (create)
- `apps/api/src/auth/infrastructure/auth-infrastructure.module.ts` (create)
- `apps/api/src/auth/infrastructure/presenter/http/dto/login.dto.ts` (create)
- `apps/api/src/auth/infrastructure/presenter/http/dto/refresh.dto.ts` (create)
- `apps/api/src/auth/infrastructure/presenter/http/dto/auth-response.dto.ts` (create)
- `apps/api/src/auth/infrastructure/presenter/http/dto/me-response.dto.ts` (create)
- `apps/api/src/auth/infrastructure/presenter/http/auth.controller.ts` (create)

**wiring**
- `apps/api/src/app.module.ts` — imports + `RequestIdMiddleware` (modify)
- `apps/api/src/main.ts` — global `ValidationPipe` + `CustomExceptionFilter` (modify)
- delete the scaffold `app.controller.ts` / `app.service.ts` / `app.controller.spec.ts`

**e2e**
- `apps/api/test/auth.e2e-spec.ts` (create)

---

## Task 1: Project tooling — deps, scripts, path alias

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/tsconfig.json`
- Create: `apps/api/.env.example`

- [ ] **Step 1: Add runtime + dev dependencies**

Run (from repo root):

```bash
npm install -w @claude-monorepo/api @nestjs/jwt @nestjs/config @prisma/client @prisma/adapter-pg pg bcrypt class-validator class-transformer
npm install -w @claude-monorepo/api -D prisma tsc-alias @types/bcrypt @types/pg
```

Expected: installs complete, `apps/api/package.json` lists the new packages.

- [ ] **Step 2: Add `db:*` scripts, `build` alias rewrite, and jest `moduleNameMapper`**

In `apps/api/package.json`, set the `build` script and add the db scripts:

```jsonc
"scripts": {
  "build": "nest build && tsc-alias",
  "format": "biome format --write src test",
  "start": "nest start",
  "start:dev": "nest start --watch",
  "start:debug": "nest start --debug --watch",
  "start:prod": "node dist/main",
  "lint": "biome lint src test",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:cov": "jest --coverage",
  "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
  "test:e2e": "jest --config ./test/jest-e2e.json",
  "db:generate": "prisma generate",
  "db:migration": "prisma migrate deploy",
  "db:seed": "ts-node prisma/seed.ts"
}
```

In the same file, add `moduleNameMapper` to the `jest` block so `@/` resolves in unit tests:

```jsonc
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node",
  "moduleNameMapper": { "^@/(.*)$": "<rootDir>/$1" }
}
```

Also add a Prisma seed hook at the top level of `package.json`:

```jsonc
"prisma": { "seed": "ts-node prisma/seed.ts" }
```

- [ ] **Step 3: Configure the `@/` path alias in tsconfig**

In `apps/api/tsconfig.json`, add `baseUrl` and `paths` inside `compilerOptions`:

```jsonc
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": { "@/*": ["src/*"] }
    // ...keep all existing options
  }
}
```

- [ ] **Step 4: Create the env template**

Create `apps/api/.env.example`:

```dotenv
# PostgreSQL connection string used by Prisma + @prisma/adapter-pg
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/claude_monorepo?schema=public"

# JWT — keep these secret; use long random strings in real environments
ACCESS_TOKEN_SECRET="dev-access-secret-change-me"
REFRESH_TOKEN_SECRET="dev-refresh-secret-change-me"
ACCESS_TOKEN_TTL="15m"
REFRESH_TOKEN_TTL="7d"

# Seed root user (consumed by prisma/seed.ts)
SEED_ROOT_NAME="Root"
SEED_ROOT_USERNAME="root"
SEED_ROOT_PASSWORD="ChangeMe123!"
SEED_ROOT_EMAIL="root@example.com"
```

- [ ] **Step 5: Ensure `.env` is git-ignored**

Check the repo-root `.gitignore`. If it does not already ignore env files, append:

```gitignore
# local env files
.env
**/.env
```

Run: `git check-ignore apps/api/.env` — Expected: prints `apps/api/.env` (ignored). Create a local `apps/api/.env` by copying `.env.example` (do NOT commit it).

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.json apps/api/.env.example .gitignore
git commit -m "chore(api): add auth dependencies, db scripts, and @/ path alias"
```

---

## Task 2: Prisma schema + client generation

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma.config.ts`
- Modify: `apps/api/package.json` (install `dotenv`; remove the now-obsolete top-level `prisma` key — see Prisma 7 note)

> **Prisma 7 note (important):** In Prisma 7 the connection URL is **removed from `schema.prisma`** and configured in `prisma.config.ts` instead. The `package.json` `"prisma": { "seed" }` key is deprecated in favour of `prisma.config.ts` `migrations.seed`. The Prisma CLI does not auto-load `.env`, so `prisma.config.ts` and the seed script must `import "dotenv/config"` (requires the `dotenv` dev dependency). We keep `generator client { provider = "prisma-client-js" }`, which still emits to `node_modules/@prisma/client`, so app code imports `{ PrismaClient } from "@prisma/client"` (matches `docs/api/database.md`).

- [ ] **Step 1: Write the schema**

Create `apps/api/prisma/schema.prisma` (no `url` in the datasource — Prisma 7):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id        String   @id @default(cuid())
  name      String
  username  String   @unique
  password  String
  email     String   @unique
  isRoot    Boolean  @default(false) @map("is_root")
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())  @map("created_at")
  updatedAt DateTime @updatedAt       @map("updated_at")

  @@map("users")
}
```

- [ ] **Step 1b: Install `dotenv` and create `prisma.config.ts`**

Run (from repo root): `npm install -w @claude-monorepo/api -D dotenv`

Create `apps/api/prisma.config.ts`:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

Then remove the now-obsolete top-level `"prisma": { "seed": ... }` key from `apps/api/package.json` (superseded by `prisma.config.ts`). Keep the `db:generate` / `db:migration` / `db:seed` scripts.

> `@prisma/adapter-pg` is wired in `DatabaseService` (Task 4), not in the schema.

- [ ] **Step 2: Generate the client**

Run (from repo root): `npm run db:generate -w @claude-monorepo/api`
Expected: `✔ Generated Prisma Client` and the `@prisma/client` types now know about `User`.

- [ ] **Step 3: Create the initial migration (requires a running Postgres)**

Run: `npx prisma migrate dev --name init --schema apps/api/prisma/schema.prisma`
Expected: a migration is created under `apps/api/prisma/migrations/` and applied to your local DB.

> If no local Postgres is available yet, skip applying but still run `db:generate` so types compile. The migration must be created before merging.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma.config.ts apps/api/package.json apps/api/prisma/migrations package-lock.json
git commit -m "feat(api): add Prisma User schema and Prisma 7 config"
```

---

## Task 3: Typed env accessor

**Files:**
- Create: `apps/api/src/config/env.ts`
- Test: `apps/api/src/config/env.spec.ts`

A tiny helper that reads required env vars and throws a clear error when missing, so misconfiguration fails fast instead of producing `undefined` secrets.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/config/env.spec.ts`:

```ts
import { requireEnv } from "@/config/env";

describe("requireEnv", () => {
  it("returns the value when the variable is set", () => {
    const env = { FOO: "bar" } as NodeJS.ProcessEnv;
    expect(requireEnv(env, "FOO")).toBe("bar");
  });

  it("throws when the variable is missing", () => {
    const env = {} as NodeJS.ProcessEnv;
    expect(() => requireEnv(env, "FOO")).toThrow("Missing required env var: FOO");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -w @claude-monorepo/api -- env.spec`
Expected: FAIL — cannot find module `@/config/env`.

- [ ] **Step 3: Implement**

Create `apps/api/src/config/env.ts`:

```ts
/**
 * Reads a required environment variable, throwing a descriptive error when it
 * is absent. Keeps secret/config wiring fail-fast instead of silently undefined.
 */
export function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -w @claude-monorepo/api -- env.spec`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/config/env.ts apps/api/src/config/env.spec.ts
git commit -m "feat(api): add fail-fast required-env accessor"
```

---

## Task 4: Core database module

**Files:**
- Create: `apps/api/src/core/database/database.service.ts`
- Create: `apps/api/src/core/database/database.module.ts`
- Test: `apps/api/src/core/database/database.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Mocks both `@prisma/client` and `@prisma/adapter-pg` at the boundary (per database.md). Asserts the service exposes the constructed client via `getClient()`.

Create `apps/api/src/core/database/database.service.spec.ts`:

```ts
const connectMock = jest.fn();
const disconnectMock = jest.fn();

jest.mock("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({ adapter: true })),
}));

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: connectMock,
    $disconnect: disconnectMock,
  })),
}));

import { DatabaseService } from "@/core/database/database.service";

describe("DatabaseService", () => {
  it("exposes a Prisma client via getClient()", () => {
    const service = new DatabaseService();
    expect(service.getClient()).toBeDefined();
  });

  it("connects on module init and disconnects on destroy", async () => {
    const service = new DatabaseService();
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -w @claude-monorepo/api -- database.service.spec`
Expected: FAIL — cannot find module `@/core/database/database.service`.

- [ ] **Step 3: Implement the service**

Create `apps/api/src/core/database/database.service.ts` (follows the exact construction pattern in `docs/api/database.md` — `PrismaPg` adapter, composition not inheritance):

```ts
import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Owns the single PrismaClient instance for the app. Uses the @prisma/adapter-pg
 * driver adapter (NOT the legacy binary engine). Consumers access the client via
 * getClient() — composition, never inheritance.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly client: PrismaClient;

  constructor() {
    // Prisma 7: PrismaPg takes a config object with `connectionString`.
    // (docs/api/database.md shows the older string-arg form; v7 uses the object form.)
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
    this.client = new PrismaClient({ adapter });
  }

  getClient(): PrismaClient {
    return this.client;
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
```

- [ ] **Step 4: Create the module**

Create `apps/api/src/core/database/database.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { DatabaseService } from "@/core/database/database.service";

/**
 * Global-ish data access module. Provides and exports DatabaseService so any
 * feature's infrastructure layer can obtain the Prisma client.
 */
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npm test -w @claude-monorepo/api -- database.service.spec`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/core/database
git commit -m "feat(api): add core DatabaseService with @prisma/adapter-pg"
```

---

## Task 5: Custom error classes

**Files:**
- Create: `apps/api/src/common/errors/app.exception.ts` — shared `AppException { readonly code: string }` interface (implemented by every custom error; consumed by `CustomExceptionFilter` in Task 7)
- Create: `apps/api/src/common/errors/invalid-credentials.error.ts`
- Create: `apps/api/src/common/errors/user-disabled.error.ts`
- Create: `apps/api/src/common/errors/invalid-token.error.ts`
- Create: `apps/api/src/common/errors/unauthorized.error.ts`
- Create: `apps/api/src/common/errors/database.error.ts`
- Test: `apps/api/src/common/errors/errors.spec.ts`

All extend `HttpException` with a `readonly code`, per error-handling.md.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/common/errors/errors.spec.ts`:

```ts
import { HttpException, HttpStatus } from "@nestjs/common";
import { DatabaseError } from "@/common/errors/database.error";
import { InvalidCredentialsError } from "@/common/errors/invalid-credentials.error";
import { InvalidTokenError } from "@/common/errors/invalid-token.error";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import { UserDisabledError } from "@/common/errors/user-disabled.error";

describe("custom errors", () => {
  it("InvalidCredentialsError is 401 with code AUTH_INVALID_CREDENTIALS", () => {
    const err = new InvalidCredentialsError();
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(err.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("UserDisabledError is 403 with code AUTH_USER_DISABLED", () => {
    const err = new UserDisabledError();
    expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(err.code).toBe("AUTH_USER_DISABLED");
  });

  it("InvalidTokenError is 401 with code AUTH_INVALID_TOKEN", () => {
    const err = new InvalidTokenError();
    expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(err.code).toBe("AUTH_INVALID_TOKEN");
  });

  it("UnauthorizedError is 401 with code AUTH_UNAUTHORIZED", () => {
    const err = new UnauthorizedError();
    expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(err.code).toBe("AUTH_UNAUTHORIZED");
  });

  it("DatabaseError is 500 with code DATABASE_ERROR", () => {
    const err = new DatabaseError("boom");
    expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(err.code).toBe("DATABASE_ERROR");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -w @claude-monorepo/api -- errors.spec`
Expected: FAIL — cannot find the error modules.

- [ ] **Step 3: Implement the error classes**

Create `apps/api/src/common/errors/invalid-credentials.error.ts`:

```ts
import { HttpException, HttpStatus } from "@nestjs/common";

export class InvalidCredentialsError extends HttpException {
  readonly code = "AUTH_INVALID_CREDENTIALS";

  constructor() {
    super("Invalid username or password", HttpStatus.UNAUTHORIZED);
  }
}
```

Create `apps/api/src/common/errors/user-disabled.error.ts`:

```ts
import { HttpException, HttpStatus } from "@nestjs/common";

export class UserDisabledError extends HttpException {
  readonly code = "AUTH_USER_DISABLED";

  constructor() {
    super("User account is disabled", HttpStatus.FORBIDDEN);
  }
}
```

Create `apps/api/src/common/errors/invalid-token.error.ts`:

```ts
import { HttpException, HttpStatus } from "@nestjs/common";

export class InvalidTokenError extends HttpException {
  readonly code = "AUTH_INVALID_TOKEN";

  constructor() {
    super("Invalid or expired token", HttpStatus.UNAUTHORIZED);
  }
}
```

Create `apps/api/src/common/errors/unauthorized.error.ts`:

```ts
import { HttpException, HttpStatus } from "@nestjs/common";

export class UnauthorizedError extends HttpException {
  readonly code = "AUTH_UNAUTHORIZED";

  constructor() {
    super("Missing or malformed authorization header", HttpStatus.UNAUTHORIZED);
  }
}
```

Create `apps/api/src/common/errors/database.error.ts`:

```ts
import { HttpException, HttpStatus } from "@nestjs/common";

export class DatabaseError extends HttpException {
  readonly code = "DATABASE_ERROR";

  constructor(message: string) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -w @claude-monorepo/api -- errors.spec`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/errors
git commit -m "feat(api): add custom HttpException error classes"
```

---

## Task 6: Request-id middleware

**Files:**
- Create: `apps/api/src/common/middleware/request-id.middleware.ts`
- Test: `apps/api/src/common/middleware/request-id.middleware.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/common/middleware/request-id.middleware.spec.ts`:

```ts
import type { Request, Response } from "express";
import { RequestIdMiddleware } from "@/common/middleware/request-id.middleware";

describe("RequestIdMiddleware", () => {
  it("attaches a requestId to the request and the response header, then calls next", () => {
    const middleware = new RequestIdMiddleware();
    const req = {} as Request & { requestId?: string };
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(typeof req.requestId).toBe("string");
    expect(req.requestId).toHaveLength(36); // uuid v4
    expect(setHeader).toHaveBeenCalledWith("X-Request-Id", req.requestId);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -w @claude-monorepo/api -- request-id.middleware.spec`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/api/src/common/middleware/request-id.middleware.ts`:

```ts
import { randomUUID } from "node:crypto";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

/**
 * Generates a UUID per request, attaches it to req.requestId, and echoes it in
 * the X-Request-Id response header. CustomExceptionFilter maps requestId →
 * traceId so the same id flows through logs and error responses.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { requestId?: string }, res: Response, next: NextFunction): void {
    const id = randomUUID();
    req.requestId = id;
    res.setHeader("X-Request-Id", id);
    next();
  }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -w @claude-monorepo/api -- request-id.middleware.spec`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/middleware
git commit -m "feat(api): add request-id middleware for tracing"
```

---

## Task 7: Custom exception filter

**Files:**
- Create: `apps/api/src/common/filters/custom-exception.filter.ts`
- Test: `apps/api/src/common/filters/custom-exception.filter.spec.ts`

Converts every thrown error into the Standard Error Response from error-handling.md.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/common/filters/custom-exception.filter.spec.ts`:

```ts
import type { ArgumentsHost } from "@nestjs/common";
import { HttpException, HttpStatus } from "@nestjs/common";
import { InvalidCredentialsError } from "@/common/errors/invalid-credentials.error";
import { CustomExceptionFilter } from "@/common/filters/custom-exception.filter";

function makeHost(requestId?: string) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ requestId }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe("CustomExceptionFilter", () => {
  const filter = new CustomExceptionFilter();

  it("formats a custom error with its code and traceId", () => {
    const { host, status, json } = makeHost("trace-123");
    filter.catch(new InvalidCredentialsError(), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        httpCode: 401,
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Invalid username or password",
        traceId: "trace-123",
      }),
    );
  });

  it("maps a generic HttpException without a code to a status-derived code", () => {
    const { host, json } = makeHost("trace-1");
    filter.catch(new HttpException("Nope", HttpStatus.NOT_FOUND), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ httpCode: 404, code: "NOT_FOUND" }),
    );
  });

  it("maps an unknown error to 500 INTERNAL_ERROR", () => {
    const { host, json } = makeHost();
    filter.catch(new Error("boom"), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ httpCode: 500, code: "INTERNAL_ERROR", traceId: "unknown" }),
    );
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -w @claude-monorepo/api -- custom-exception.filter.spec`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/api/src/common/filters/custom-exception.filter.ts`:

```ts
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { AppException } from "@/common/errors/app.exception";

/** Maps common HTTP statuses to a default error code for non-custom exceptions. */
const STATUS_CODE_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "VALIDATION_ERROR",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.METHOD_NOT_ALLOWED]: "METHOD_NOT_ALLOWED",
};

function hasCode(value: unknown): value is AppException {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof (value as { code: unknown }).code === "string"
  );
}

/**
 * Catches every exception (custom, framework, or unknown) and returns the
 * Standard Error Response. No raw NestJS/Express error shape ever reaches the
 * client. `code` is what the frontend maps to user-facing text.
 */
@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const traceId = req.requestId ?? "unknown";

    let httpCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "Internal server error";

    if (exception instanceof HttpException) {
      httpCode = exception.getStatus();
      message = this.extractMessage(exception);
      code = hasCode(exception) ? exception.code : (STATUS_CODE_MAP[httpCode] ?? "HTTP_ERROR");
    }

    res.status(httpCode).json({
      httpCode,
      code,
      message,
      traceId,
      createdAt: new Date().toISOString(),
    });
  }

  private extractMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === "string") {
      return response;
    }
    if (typeof response === "object" && response !== null && "message" in response) {
      const { message } = response as { message: string | string[] };
      return Array.isArray(message) ? message.join(", ") : message;
    }
    return exception.message;
  }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -w @claude-monorepo/api -- custom-exception.filter.spec`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/filters
git commit -m "feat(api): add CustomExceptionFilter with standard error response"
```

---

## Task 8: User domain object

**Files:**
- Create: `apps/api/src/user/domain/user.vo.ts`
- Test: `apps/api/src/user/domain/user.vo.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/user/domain/user.vo.spec.ts`:

```ts
import { User, type UserProps } from "@/user/domain/user.vo";

const props: UserProps = {
  id: "user_1",
  name: "Root",
  username: "root",
  password: "hashed-secret",
  email: "root@example.com",
  isRoot: true,
  enabled: true,
  createdAt: new Date("2026-06-05T00:00:00.000Z"),
  updatedAt: new Date("2026-06-05T00:00:00.000Z"),
};

describe("User", () => {
  it("exposes identity and auth-relevant getters", () => {
    const user = new User(props);
    expect(user.id).toBe("user_1");
    expect(user.username).toBe("root");
    expect(user.passwordHash).toBe("hashed-secret");
    expect(user.isRoot).toBe(true);
    expect(user.enabled).toBe(true);
  });

  it("toProfile() omits the password", () => {
    const profile = new User(props).toProfile();
    expect(profile).not.toHaveProperty("password");
    expect(profile).toEqual({
      id: "user_1",
      name: "Root",
      username: "root",
      email: "root@example.com",
      isRoot: true,
      enabled: true,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm test -w @claude-monorepo/api -- user.vo.spec`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/api/src/user/domain/user.vo.ts`:

```ts
export interface UserProps {
  id: string;
  name: string;
  username: string;
  /** bcrypt hash — never exposed in a profile. */
  password: string;
  email: string;
  isRoot: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Public-safe view of a user (no password). */
export type UserProfile = Omit<UserProps, "password">;

/**
 * User domain object. Guards which fields leave the domain — the password hash
 * is only reachable through `passwordHash` (for credential checks) and is
 * stripped by `toProfile()` so it can never reach a presenter/response.
 */
export class User {
  constructor(private readonly props: UserProps) {}

  get id(): string {
    return this.props.id;
  }

  get username(): string {
    return this.props.username;
  }

  get passwordHash(): string {
    return this.props.password;
  }

  get isRoot(): boolean {
    return this.props.isRoot;
  }

  get enabled(): boolean {
    return this.props.enabled;
  }

  toProfile(): UserProfile {
    const { password: _password, ...profile } = this.props;
    return profile;
  }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm test -w @claude-monorepo/api -- user.vo.spec`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/user/domain
git commit -m "feat(api): add User domain object with password-safe profile"
```

---

## Task 9: User repository port + Prisma implementation

**Files:**
- Create: `apps/api/src/user/application/user.repository.ts`
- Create: `apps/api/src/user/infrastructure/persistence/user.mapper.ts`
- Create: `apps/api/src/user/infrastructure/persistence/prisma-user.repository.ts`
- Create: `apps/api/src/user/infrastructure/user-infrastructure.module.ts`
- Create: `apps/api/src/user/application/user.module.ts`
- Test: `apps/api/src/user/infrastructure/persistence/user.mapper.spec.ts`
- Test: `apps/api/src/user/infrastructure/persistence/prisma-user.repository.spec.ts`

- [ ] **Step 1: Define the port**

Create `apps/api/src/user/application/user.repository.ts`:

```ts
import type { User } from "@/user/domain/user.vo";

/** DI token for the UserRepository port. */
export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

/**
 * Persistence-agnostic access to users. The auth feature depends on this port,
 * never on Prisma directly.
 */
export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}
```

- [ ] **Step 2: Write the failing mapper test**

Create `apps/api/src/user/infrastructure/persistence/user.mapper.spec.ts`:

```ts
import { UserMapper } from "@/user/infrastructure/persistence/user.mapper";

const row = {
  id: "user_1",
  name: "Root",
  username: "root",
  password: "hashed-secret",
  email: "root@example.com",
  isRoot: true,
  enabled: true,
  createdAt: new Date("2026-06-05T00:00:00.000Z"),
  updatedAt: new Date("2026-06-05T00:00:00.000Z"),
};

describe("UserMapper", () => {
  it("maps a Prisma row to a User domain object", () => {
    const user = UserMapper.toDomain(row);
    expect(user.id).toBe("user_1");
    expect(user.username).toBe("root");
    expect(user.passwordHash).toBe("hashed-secret");
    expect(user.toProfile().email).toBe("root@example.com");
  });
});
```

- [ ] **Step 3: Run it, verify it fails**

Run: `npm test -w @claude-monorepo/api -- user.mapper.spec`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the mapper**

Create `apps/api/src/user/infrastructure/persistence/user.mapper.ts`:

```ts
import type { User as PrismaUser } from "@prisma/client";
import { User } from "@/user/domain/user.vo";

/** Maps the Prisma `User` row to the `User` domain object. */
export const UserMapper = {
  toDomain(row: PrismaUser): User {
    return new User({
      id: row.id,
      name: row.name,
      username: row.username,
      password: row.password,
      email: row.email,
      isRoot: row.isRoot,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },
};
```

- [ ] **Step 5: Run it, verify it passes**

Run: `npm test -w @claude-monorepo/api -- user.mapper.spec`
Expected: PASS (1 test).

- [ ] **Step 6: Write the failing repository test**

Create `apps/api/src/user/infrastructure/persistence/prisma-user.repository.spec.ts`:

```ts
import { DatabaseError } from "@/common/errors/database.error";
import { PrismaUserRepository } from "@/user/infrastructure/persistence/prisma-user.repository";

const row = {
  id: "user_1",
  name: "Root",
  username: "root",
  password: "hashed-secret",
  email: "root@example.com",
  isRoot: true,
  enabled: true,
  createdAt: new Date("2026-06-05T00:00:00.000Z"),
  updatedAt: new Date("2026-06-05T00:00:00.000Z"),
};

function makeDb(findUnique: jest.Mock) {
  return { getClient: () => ({ user: { findUnique } }) } as never;
}

describe("PrismaUserRepository", () => {
  it("findByUsername returns a mapped User when found", async () => {
    const findUnique = jest.fn().mockResolvedValue(row);
    const repo = new PrismaUserRepository(makeDb(findUnique));
    const user = await repo.findByUsername("root");
    expect(findUnique).toHaveBeenCalledWith({ where: { username: "root" } });
    expect(user?.username).toBe("root");
  });

  it("findById returns null when not found", async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const repo = new PrismaUserRepository(makeDb(findUnique));
    expect(await repo.findById("missing")).toBeNull();
  });

  it("wraps Prisma failures in DatabaseError", async () => {
    const findUnique = jest.fn().mockRejectedValue(new Error("connection lost"));
    const repo = new PrismaUserRepository(makeDb(findUnique));
    await expect(repo.findByUsername("root")).rejects.toBeInstanceOf(DatabaseError);
  });
});
```

- [ ] **Step 7: Run it, verify it fails**

Run: `npm test -w @claude-monorepo/api -- prisma-user.repository.spec`
Expected: FAIL — module not found.

- [ ] **Step 8: Implement the repository**

Create `apps/api/src/user/infrastructure/persistence/prisma-user.repository.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { DatabaseError } from "@/common/errors/database.error";
import { DatabaseService } from "@/core/database/database.service";
import type { UserRepository } from "@/user/application/user.repository";
import type { User } from "@/user/domain/user.vo";
import { UserMapper } from "@/user/infrastructure/persistence/user.mapper";

/**
 * Prisma-backed UserRepository. Wraps every Prisma call so infrastructure errors
 * (e.g. PrismaClientKnownRequestError) never leak past this boundary.
 */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByUsername(username: string): Promise<User | null> {
    try {
      const row = await this.db.getClient().user.findUnique({ where: { username } });
      return row ? UserMapper.toDomain(row) : null;
    } catch {
      throw new DatabaseError("Failed to query user by username");
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const row = await this.db.getClient().user.findUnique({ where: { id } });
      return row ? UserMapper.toDomain(row) : null;
    } catch {
      throw new DatabaseError("Failed to query user by id");
    }
  }
}
```

- [ ] **Step 9: Run it, verify it passes**

Run: `npm test -w @claude-monorepo/api -- prisma-user.repository.spec`
Expected: PASS (3 tests).

- [ ] **Step 10: Create the modules**

Create `apps/api/src/user/infrastructure/user-infrastructure.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/core/database/database.module";
import { USER_REPOSITORY } from "@/user/application/user.repository";
import { PrismaUserRepository } from "@/user/infrastructure/persistence/prisma-user.repository";

/** Binds the UserRepository port to its Prisma implementation. */
@Module({
  imports: [DatabaseModule],
  providers: [{ provide: USER_REPOSITORY, useClass: PrismaUserRepository }],
  exports: [USER_REPOSITORY],
})
export class UserInfrastructureModule {}
```

Create `apps/api/src/user/application/user.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { UserInfrastructureModule } from "@/user/infrastructure/user-infrastructure.module";

/**
 * Public entry point for the user feature. Re-exports the infrastructure module
 * so consumers (e.g. AuthModule) get the USER_REPOSITORY port.
 */
@Module({
  imports: [UserInfrastructureModule],
  exports: [UserInfrastructureModule],
})
export class UserModule {}
```

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/user
git commit -m "feat(api): add user repository port and Prisma implementation"
```

---

## Task 10: Auth ports — TokenService & PasswordHasher

**Files:**
- Create: `apps/api/src/auth/application/token.service.ts`
- Create: `apps/api/src/auth/application/password-hasher.ts`

Interface-only task (no logic to test yet; implementations are tested in Tasks 11–12).

- [ ] **Step 1: Define the TokenService port**

Create `apps/api/src/auth/application/token.service.ts`:

```ts
/** DI token for the TokenService port. */
export const TOKEN_SERVICE = Symbol("TOKEN_SERVICE");

export interface AccessTokenPayload {
  sub: string;
  username: string;
  isRoot: boolean;
}

export interface RefreshTokenPayload {
  sub: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Issues and verifies signed JWTs. Access and refresh tokens use separate
 * secrets and carry a `type` claim that verification enforces, so the two are
 * never interchangeable.
 */
export interface TokenService {
  signAccess(payload: AccessTokenPayload): Promise<string>;
  signRefresh(payload: RefreshTokenPayload): Promise<string>;
  verifyAccess(token: string): Promise<AccessTokenPayload>;
  verifyRefresh(token: string): Promise<RefreshTokenPayload>;
}
```

- [ ] **Step 2: Define the PasswordHasher port**

Create `apps/api/src/auth/application/password-hasher.ts`:

```ts
/** DI token for the PasswordHasher port. */
export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER");

/** Hashes and verifies passwords. Keeps bcrypt out of the application service. */
export interface PasswordHasher {
  compare(plain: string, hash: string): Promise<boolean>;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth/application/token.service.ts apps/api/src/auth/application/password-hasher.ts
git commit -m "feat(api): add TokenService and PasswordHasher ports"
```

---

## Task 11: JWT token service implementation

**Files:**
- Create: `apps/api/src/auth/infrastructure/jwt-token.service.ts`
- Test: `apps/api/src/auth/infrastructure/jwt-token.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Uses a real `JwtService` (deterministic) and a fake `ConfigService` returning known secrets/TTLs.

Create `apps/api/src/auth/infrastructure/jwt-token.service.spec.ts`:

```ts
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InvalidTokenError } from "@/common/errors/invalid-token.error";
import { JwtTokenService } from "@/auth/infrastructure/jwt-token.service";

function makeService(): JwtTokenService {
  const config = {
    get: (key: string) =>
      ({
        ACCESS_TOKEN_SECRET: "access-secret",
        REFRESH_TOKEN_SECRET: "refresh-secret",
        ACCESS_TOKEN_TTL: "15m",
        REFRESH_TOKEN_TTL: "7d",
      })[key],
  } as unknown as ConfigService;
  return new JwtTokenService(new JwtService({}), config);
}

describe("JwtTokenService", () => {
  it("signs and verifies an access token round-trip", async () => {
    const service = makeService();
    const token = await service.signAccess({ sub: "u1", username: "root", isRoot: true });
    const payload = await service.verifyAccess(token);
    expect(payload).toEqual({ sub: "u1", username: "root", isRoot: true });
  });

  it("signs and verifies a refresh token round-trip", async () => {
    const service = makeService();
    const token = await service.signRefresh({ sub: "u1" });
    const payload = await service.verifyRefresh(token);
    expect(payload).toEqual({ sub: "u1" });
  });

  it("rejects an access token presented as a refresh token", async () => {
    const service = makeService();
    const access = await service.signAccess({ sub: "u1", username: "root", isRoot: true });
    await expect(service.verifyRefresh(access)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects a garbage token", async () => {
    const service = makeService();
    await expect(service.verifyAccess("not-a-jwt")).rejects.toBeInstanceOf(InvalidTokenError);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -w @claude-monorepo/api -- jwt-token.service.spec`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/api/src/auth/infrastructure/jwt-token.service.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenService,
} from "@/auth/application/token.service";
import { InvalidTokenError } from "@/common/errors/invalid-token.error";

interface SignedAccess extends AccessTokenPayload {
  type: "access";
}

interface SignedRefresh extends RefreshTokenPayload {
  type: "refresh";
}

/** @nestjs/jwt implementation of the TokenService port. */
@Injectable()
export class JwtTokenService implements TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  signAccess(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(
      { ...payload, type: "access" },
      {
        secret: this.config.get<string>("ACCESS_TOKEN_SECRET"),
        expiresIn: this.config.get<string>("ACCESS_TOKEN_TTL"),
      },
    );
  }

  signRefresh(payload: RefreshTokenPayload): Promise<string> {
    return this.jwt.signAsync(
      { ...payload, type: "refresh" },
      {
        secret: this.config.get<string>("REFRESH_TOKEN_SECRET"),
        expiresIn: this.config.get<string>("REFRESH_TOKEN_TTL"),
      },
    );
  }

  async verifyAccess(token: string): Promise<AccessTokenPayload> {
    const decoded = await this.verify<SignedAccess>(token, "ACCESS_TOKEN_SECRET");
    if (decoded.type !== "access") {
      throw new InvalidTokenError();
    }
    return { sub: decoded.sub, username: decoded.username, isRoot: decoded.isRoot };
  }

  async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
    const decoded = await this.verify<SignedRefresh>(token, "REFRESH_TOKEN_SECRET");
    if (decoded.type !== "refresh") {
      throw new InvalidTokenError();
    }
    return { sub: decoded.sub };
  }

  private async verify<T extends object>(token: string, secretKey: string): Promise<T> {
    try {
      return await this.jwt.verifyAsync<T>(token, {
        secret: this.config.get<string>(secretKey),
      });
    } catch {
      throw new InvalidTokenError();
    }
  }
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npm test -w @claude-monorepo/api -- jwt-token.service.spec`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/infrastructure/jwt-token.service.ts apps/api/src/auth/infrastructure/jwt-token.service.spec.ts
git commit -m "feat(api): add JWT token service with typed access/refresh tokens"
```

---

## Task 12: bcrypt password hasher

**Files:**
- Create: `apps/api/src/auth/infrastructure/bcrypt-password-hasher.ts`
- Test: `apps/api/src/auth/infrastructure/bcrypt-password-hasher.spec.ts`

- [ ] **Step 1: Write the failing test**

Mocks `bcrypt` at the boundary (per testing.md).

Create `apps/api/src/auth/infrastructure/bcrypt-password-hasher.spec.ts`:

```ts
jest.mock("bcrypt", () => ({ compare: jest.fn() }));

import * as bcrypt from "bcrypt";
import { BcryptPasswordHasher } from "@/auth/infrastructure/bcrypt-password-hasher";

describe("BcryptPasswordHasher", () => {
  it("delegates comparison to bcrypt.compare", async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const hasher = new BcryptPasswordHasher();
    const result = await hasher.compare("plain", "hash");
    expect(bcrypt.compare).toHaveBeenCalledWith("plain", "hash");
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -w @claude-monorepo/api -- bcrypt-password-hasher.spec`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/api/src/auth/infrastructure/bcrypt-password-hasher.ts`:

```ts
import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import type { PasswordHasher } from "@/auth/application/password-hasher";

/** bcrypt implementation of the PasswordHasher port. */
@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npm test -w @claude-monorepo/api -- bcrypt-password-hasher.spec`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/infrastructure/bcrypt-password-hasher.ts apps/api/src/auth/infrastructure/bcrypt-password-hasher.spec.ts
git commit -m "feat(api): add bcrypt password hasher"
```

---

## Task 13: Auth service (login / refresh / getProfile)

**Files:**
- Create: `apps/api/src/auth/application/auth.service.ts`
- Test: `apps/api/src/auth/application/auth.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Construct `AuthService` directly with mocked ports.

Create `apps/api/src/auth/application/auth.service.spec.ts`:

```ts
import { AuthService } from "@/auth/application/auth.service";
import type { PasswordHasher } from "@/auth/application/password-hasher";
import type { TokenService } from "@/auth/application/token.service";
import { InvalidCredentialsError } from "@/common/errors/invalid-credentials.error";
import { InvalidTokenError } from "@/common/errors/invalid-token.error";
import { UserDisabledError } from "@/common/errors/user-disabled.error";
import type { UserRepository } from "@/user/application/user.repository";
import { User } from "@/user/domain/user.vo";

function makeUser(overrides: Partial<{ enabled: boolean }> = {}): User {
  return new User({
    id: "u1",
    name: "Root",
    username: "root",
    password: "hashed",
    email: "root@example.com",
    isRoot: true,
    enabled: overrides.enabled ?? true,
    createdAt: new Date("2026-06-05T00:00:00.000Z"),
    updatedAt: new Date("2026-06-05T00:00:00.000Z"),
  });
}

function setup(opts: {
  user?: User | null;
  compare?: boolean;
}) {
  const users: jest.Mocked<UserRepository> = {
    findByUsername: jest.fn().mockResolvedValue(opts.user ?? null),
    findById: jest.fn().mockResolvedValue(opts.user ?? null),
  };
  const tokens: jest.Mocked<TokenService> = {
    signAccess: jest.fn().mockResolvedValue("access-token"),
    signRefresh: jest.fn().mockResolvedValue("refresh-token"),
    verifyAccess: jest.fn(),
    verifyRefresh: jest.fn().mockResolvedValue({ sub: "u1" }),
  };
  const hasher: jest.Mocked<PasswordHasher> = {
    compare: jest.fn().mockResolvedValue(opts.compare ?? true),
  };
  return { service: new AuthService(users, tokens, hasher), users, tokens, hasher };
}

describe("AuthService.login", () => {
  it("returns a token pair on valid credentials", async () => {
    const { service } = setup({ user: makeUser(), compare: true });
    const result = await service.login("root", "pw");
    expect(result).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("throws InvalidCredentialsError when the user does not exist", async () => {
    const { service } = setup({ user: null });
    await expect(service.login("ghost", "pw")).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("throws UserDisabledError when the user is disabled", async () => {
    const { service } = setup({ user: makeUser({ enabled: false }) });
    await expect(service.login("root", "pw")).rejects.toBeInstanceOf(UserDisabledError);
  });

  it("throws InvalidCredentialsError when the password is wrong", async () => {
    const { service } = setup({ user: makeUser(), compare: false });
    await expect(service.login("root", "bad")).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});

describe("AuthService.refresh", () => {
  it("issues a fresh token pair for a valid refresh token", async () => {
    const { service } = setup({ user: makeUser() });
    const result = await service.refresh("refresh-token");
    expect(result).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("throws InvalidTokenError when the user no longer exists", async () => {
    const { service } = setup({ user: null });
    await expect(service.refresh("refresh-token")).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("throws UserDisabledError when the user is disabled", async () => {
    const { service } = setup({ user: makeUser({ enabled: false }) });
    await expect(service.refresh("refresh-token")).rejects.toBeInstanceOf(UserDisabledError);
  });
});

describe("AuthService.getProfile", () => {
  it("returns the profile without the password", async () => {
    const { service } = setup({ user: makeUser() });
    const profile = await service.getProfile("u1");
    expect(profile).not.toHaveProperty("password");
    expect(profile.username).toBe("root");
  });

  it("throws InvalidTokenError when the user is gone", async () => {
    const { service } = setup({ user: null });
    await expect(service.getProfile("u1")).rejects.toBeInstanceOf(InvalidTokenError);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -w @claude-monorepo/api -- auth.service.spec`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/api/src/auth/application/auth.service.ts`:

```ts
import { Inject, Injectable } from "@nestjs/common";
import { PASSWORD_HASHER, type PasswordHasher } from "@/auth/application/password-hasher";
import { TOKEN_SERVICE, type TokenPair, type TokenService } from "@/auth/application/token.service";
import { InvalidCredentialsError } from "@/common/errors/invalid-credentials.error";
import { InvalidTokenError } from "@/common/errors/invalid-token.error";
import { UserDisabledError } from "@/common/errors/user-disabled.error";
import { USER_REPOSITORY, type UserRepository } from "@/user/application/user.repository";
import type { User, UserProfile } from "@/user/domain/user.vo";

/**
 * Orchestrates authentication use cases through ports only — no Prisma, JWT, or
 * bcrypt details leak in here. login/refresh both re-check `enabled` so a
 * disabled account cannot obtain or renew tokens.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async login(username: string, password: string): Promise<TokenPair> {
    const user = await this.users.findByUsername(username);
    if (!user) {
      throw new InvalidCredentialsError();
    }
    if (!user.enabled) {
      throw new UserDisabledError();
    }
    const passwordMatches = await this.hasher.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.tokens.verifyRefresh(refreshToken);
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new InvalidTokenError();
    }
    if (!user.enabled) {
      throw new UserDisabledError();
    }
    return this.issueTokens(user);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new InvalidTokenError();
    }
    return user.toProfile();
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.signAccess({ sub: user.id, username: user.username, isRoot: user.isRoot }),
      this.tokens.signRefresh({ sub: user.id }),
    ]);
    return { accessToken, refreshToken };
  }
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npm test -w @claude-monorepo/api -- auth.service.spec`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/application/auth.service.ts apps/api/src/auth/application/auth.service.spec.ts
git commit -m "feat(api): add AuthService login/refresh/getProfile use cases"
```

---

## Task 14: JWT auth guard

**Files:**
- Create: `apps/api/src/common/guards/jwt-auth.guard.ts`
- Test: `apps/api/src/common/guards/jwt-auth.guard.spec.ts`

The guard extracts the Bearer token, verifies it via `TokenService`, and attaches `{ userId, username, isRoot }` to `req.user`.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/common/guards/jwt-auth.guard.spec.ts`:

```ts
import type { ExecutionContext } from "@nestjs/common";
import type { TokenService } from "@/auth/application/token.service";
import { InvalidTokenError } from "@/common/errors/invalid-token.error";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";

function makeContext(authorization?: string) {
  const req: { headers: Record<string, string | undefined>; user?: unknown } = {
    headers: { authorization },
  };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

describe("JwtAuthGuard", () => {
  it("passes and attaches req.user for a valid Bearer token", async () => {
    const tokens = {
      verifyAccess: jest.fn().mockResolvedValue({ sub: "u1", username: "root", isRoot: true }),
    } as unknown as TokenService;
    const guard = new JwtAuthGuard(tokens);
    const { ctx, req } = makeContext("Bearer good-token");

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({ userId: "u1", username: "root", isRoot: true });
  });

  it("throws UnauthorizedError when the header is missing", async () => {
    const tokens = { verifyAccess: jest.fn() } as unknown as TokenService;
    const guard = new JwtAuthGuard(tokens);
    const { ctx } = makeContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws UnauthorizedError when the scheme is not Bearer", async () => {
    const tokens = { verifyAccess: jest.fn() } as unknown as TokenService;
    const guard = new JwtAuthGuard(tokens);
    const { ctx } = makeContext("Basic abc");
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("propagates InvalidTokenError when verification fails", async () => {
    const tokens = {
      verifyAccess: jest.fn().mockRejectedValue(new InvalidTokenError()),
    } as unknown as TokenService;
    const guard = new JwtAuthGuard(tokens);
    const { ctx } = makeContext("Bearer bad-token");
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(InvalidTokenError);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm test -w @claude-monorepo/api -- jwt-auth.guard.spec`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `apps/api/src/common/guards/jwt-auth.guard.ts`:

```ts
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { TOKEN_SERVICE, type TokenService } from "@/auth/application/token.service";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";

/** Principal attached to the request after a successful guard check. */
export interface AuthenticatedUser {
  userId: string;
  username: string;
  isRoot: boolean;
}

/**
 * Validates the `Authorization: Bearer <token>` header as an access token and
 * attaches the principal to req.user. Missing/malformed header → AUTH_UNAUTHORIZED;
 * invalid/expired token → AUTH_INVALID_TOKEN (from TokenService).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(TOKEN_SERVICE) private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractBearerToken(req.headers.authorization);
    const payload = await this.tokens.verifyAccess(token);
    req.user = { userId: payload.sub, username: payload.username, isRoot: payload.isRoot };
    return true;
  }

  private extractBearerToken(header: string | undefined): string {
    if (!header) {
      throw new UnauthorizedError();
    }
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedError();
    }
    return token;
  }
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `npm test -w @claude-monorepo/api -- jwt-auth.guard.spec`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/guards
git commit -m "feat(api): add JWT auth guard"
```

---

## Task 15: Auth DTOs + controller + modules

**Files:**
- Create: `apps/api/src/auth/infrastructure/presenter/http/dto/login.dto.ts`
- Create: `apps/api/src/auth/infrastructure/presenter/http/dto/refresh.dto.ts`
- Create: `apps/api/src/auth/infrastructure/presenter/http/dto/auth-response.dto.ts`
- Create: `apps/api/src/auth/infrastructure/presenter/http/dto/me-response.dto.ts`
- Create: `apps/api/src/auth/infrastructure/presenter/http/auth.controller.ts`
- Create: `apps/api/src/auth/infrastructure/auth-infrastructure.module.ts`
- Create: `apps/api/src/auth/application/auth.module.ts`
- Test: `apps/api/src/auth/infrastructure/presenter/http/auth.controller.spec.ts`

- [ ] **Step 1: Create the request DTOs**

Create `apps/api/src/auth/infrastructure/presenter/http/dto/login.dto.ts`:

```ts
import { IsNotEmpty, IsString } from "class-validator";

/** Login request body. Shape-only validation per validation.md. */
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
```

Create `apps/api/src/auth/infrastructure/presenter/http/dto/refresh.dto.ts`:

```ts
import { IsNotEmpty, IsString } from "class-validator";

/** Refresh request body. */
export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
```

- [ ] **Step 2: Create the response DTOs**

Create `apps/api/src/auth/infrastructure/presenter/http/dto/auth-response.dto.ts`:

```ts
/** Response body for login and refresh. */
export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
}
```

Create `apps/api/src/auth/infrastructure/presenter/http/dto/me-response.dto.ts`:

```ts
import type { UserProfile } from "@/user/domain/user.vo";

/** Response body for GET /auth/me (password-free user profile). */
export type MeResponseDto = UserProfile;
```

- [ ] **Step 3: Write the failing controller test**

Create `apps/api/src/auth/infrastructure/presenter/http/auth.controller.spec.ts`:

```ts
import type { AuthService } from "@/auth/application/auth.service";
import type { AuthenticatedUser } from "@/common/guards/jwt-auth.guard";
import { AuthController } from "@/auth/infrastructure/presenter/http/auth.controller";

describe("AuthController", () => {
  const pair = { accessToken: "a", refreshToken: "r" };

  it("login delegates to AuthService.login", async () => {
    const auth = { login: jest.fn().mockResolvedValue(pair) } as unknown as AuthService;
    const controller = new AuthController(auth);
    const result = await controller.login({ username: "root", password: "pw" });
    expect(auth.login).toHaveBeenCalledWith("root", "pw");
    expect(result).toBe(pair);
  });

  it("refresh delegates to AuthService.refresh", async () => {
    const auth = { refresh: jest.fn().mockResolvedValue(pair) } as unknown as AuthService;
    const controller = new AuthController(auth);
    const result = await controller.refresh({ refreshToken: "r" });
    expect(auth.refresh).toHaveBeenCalledWith("r");
    expect(result).toBe(pair);
  });

  it("me delegates to AuthService.getProfile using req.user.userId", async () => {
    const profile = { username: "root" };
    const auth = { getProfile: jest.fn().mockResolvedValue(profile) } as unknown as AuthService;
    const controller = new AuthController(auth);
    const user: AuthenticatedUser = { userId: "u1", username: "root", isRoot: true };
    const result = await controller.me({ user } as never);
    expect(auth.getProfile).toHaveBeenCalledWith("u1");
    expect(result).toBe(profile);
  });
});
```

- [ ] **Step 4: Run it, verify it fails**

Run: `npm test -w @claude-monorepo/api -- auth.controller.spec`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement the controller**

Create `apps/api/src/auth/infrastructure/presenter/http/auth.controller.ts`:

```ts
import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "@/auth/application/auth.service";
import type { AuthResponseDto } from "@/auth/infrastructure/presenter/http/dto/auth-response.dto";
import { LoginDto } from "@/auth/infrastructure/presenter/http/dto/login.dto";
import type { MeResponseDto } from "@/auth/infrastructure/presenter/http/dto/me-response.dto";
import { RefreshDto } from "@/auth/infrastructure/presenter/http/dto/refresh.dto";
import { type AuthenticatedUser, JwtAuthGuard } from "@/common/guards/jwt-auth.guard";

/** HTTP presenter for the auth feature. No try/catch — errors propagate to the filter. */
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto.username, dto.password);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshDto): Promise<AuthResponseDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: AuthenticatedUser }): Promise<MeResponseDto> {
    return this.auth.getProfile(req.user.userId);
  }
}
```

- [ ] **Step 6: Run it, verify it passes**

Run: `npm test -w @claude-monorepo/api -- auth.controller.spec`
Expected: PASS (3 tests).

- [ ] **Step 7: Create the auth modules**

Create `apps/api/src/auth/infrastructure/auth-infrastructure.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PASSWORD_HASHER } from "@/auth/application/password-hasher";
import { TOKEN_SERVICE } from "@/auth/application/token.service";
import { BcryptPasswordHasher } from "@/auth/infrastructure/bcrypt-password-hasher";
import { JwtTokenService } from "@/auth/infrastructure/jwt-token.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";

/**
 * Binds the auth ports to their implementations and provides the guard.
 * JwtModule.register({}) supplies a JwtService; secrets/TTLs are passed per-call
 * by JwtTokenService from ConfigService (ConfigModule is global).
 */
@Module({
  imports: [JwtModule.register({})],
  providers: [
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    JwtAuthGuard,
  ],
  exports: [TOKEN_SERVICE, PASSWORD_HASHER, JwtAuthGuard],
})
export class AuthInfrastructureModule {}
```

Create `apps/api/src/auth/application/auth.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { AuthService } from "@/auth/application/auth.service";
import { AuthInfrastructureModule } from "@/auth/infrastructure/auth-infrastructure.module";
import { AuthController } from "@/auth/infrastructure/presenter/http/auth.controller";
import { UserModule } from "@/user/application/user.module";

/**
 * Public entry point for the auth feature. Wires the application service to the
 * user + auth-infrastructure ports and registers the HTTP presenter.
 */
@Module({
  imports: [UserModule, AuthInfrastructureModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 8: Run all unit tests**

Run: `npm test -w @claude-monorepo/api`
Expected: PASS — all unit suites green.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/auth
git commit -m "feat(api): add auth DTOs, controller, and module wiring"
```

---

## Task 16: Application wiring — app.module + main.ts

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`
- Delete: `apps/api/src/app.controller.ts`, `apps/api/src/app.service.ts`, `apps/api/src/app.controller.spec.ts`

- [ ] **Step 1: Remove the scaffold sample files**

```bash
git rm apps/api/src/app.controller.ts apps/api/src/app.service.ts apps/api/src/app.controller.spec.ts
```

- [ ] **Step 2: Rewrite `app.module.ts`**

Replace the contents of `apps/api/src/app.module.ts` with:

```ts
import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "@/auth/application/auth.module";
import { RequestIdMiddleware } from "@/common/middleware/request-id.middleware";
import { DatabaseModule } from "@/core/database/database.module";

/** Root module. ConfigModule is global so ConfigService is injectable everywhere. */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, AuthModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
```

- [ ] **Step 3: Rewrite `main.ts`**

Replace the contents of `apps/api/src/main.ts` with:

```ts
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "@/app.module";
import { CustomExceptionFilter } from "@/common/filters/custom-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new CustomExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
```

- [ ] **Step 4: Verify the app compiles and boots**

Run: `npm run build -w @claude-monorepo/api`
Expected: build succeeds, `dist/` produced with `@/` imports rewritten by `tsc-alias`.

Run (with a local Postgres + `.env` present): `npm run start:dev -w @claude-monorepo/api`
Expected: logs `Nest application successfully started`, listening on `:3000`. Stop with Ctrl-C.

- [ ] **Step 5: Run the full unit suite + lint**

Run: `npm test -w @claude-monorepo/api`
Expected: PASS.

Run (from repo root): `npm run check`
Expected: Biome reports no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/main.ts
git commit -m "feat(api): wire auth module, global validation, filter, and tracing"
```

---

## Task 17: Root-user seed script

**Files:**
- Create: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Implement the seed**

Create `apps/api/prisma/seed.ts` (a standalone script — uses `bcrypt` and Prisma directly). It runs outside Nest, so it loads `.env` via `dotenv/config`:

```ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

/** Reads a required env var, throwing if absent (mirrors src/config/env.ts). */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

async function main(): Promise<void> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
  const prisma = new PrismaClient({ adapter });

  const username = requireEnv("SEED_ROOT_USERNAME");
  const passwordHash = await bcrypt.hash(requireEnv("SEED_ROOT_PASSWORD"), 12);

  await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      name: requireEnv("SEED_ROOT_NAME"),
      username,
      password: passwordHash,
      email: requireEnv("SEED_ROOT_EMAIL"),
      isRoot: true,
      enabled: true,
    },
  });

  console.log(`Seeded root user: ${username}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run the seed (requires Postgres + applied migration + `.env`)**

Run: `npm run db:seed -w @claude-monorepo/api`
Expected: prints `Seeded root user: root`. Running it again is idempotent (upsert), no duplicate.

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(api): add idempotent root-user seed script"
```

---

## Task 18: End-to-end tests

**Files:**
- Create: `apps/api/test/auth.e2e-spec.ts`

The e2e exercises the real controller, guard, validation pipe, exception filter, and token service together. To keep the suite hermetic (no Postgres required in CI), it overrides `USER_REPOSITORY` and `PASSWORD_HASHER` with in-memory fakes, overrides `DatabaseService` with a no-op stub (so `onModuleInit` doesn't try to `$connect` to a real Postgres), and provides real JWT secrets via env. A DB-backed e2e against a dedicated test database is a follow-up task.

- [ ] **Step 1: Write the e2e test**

Create `apps/api/test/auth.e2e-spec.ts`:

```ts
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PASSWORD_HASHER, type PasswordHasher } from "@/auth/application/password-hasher";
import { CustomExceptionFilter } from "@/common/filters/custom-exception.filter";
import { DatabaseService } from "@/core/database/database.service";
import { USER_REPOSITORY, type UserRepository } from "@/user/application/user.repository";
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

const fakeRepo: UserRepository = {
  findByUsername: async (username) => (username === "root" ? ENABLED_USER : null),
  findById: async (id) => (id === "u1" ? ENABLED_USER : null),
};

// matches password "correct-password" against the stored hash
const fakeHasher: PasswordHasher = {
  compare: async (plain) => plain === "correct-password",
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
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
      .expect(201);
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
  });

  it("GET /auth/me returns the profile with a valid access token", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: "root", password: "correct-password" });

    const res = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(res.body).toMatchObject({ username: "root", email: "root@example.com", isRoot: true });
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
      .expect(201);
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
```

- [ ] **Step 2: Align the e2e jest config with the `@/` alias**

Open `apps/api/test/jest-e2e.json` and ensure it maps `@/` and roots at the project. It must contain:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "moduleNameMapper": { "^@/(.*)$": "<rootDir>/../src/$1" }
}
```

- [ ] **Step 3: Run the e2e suite**

Run: `npm run test:e2e -w @claude-monorepo/api`
Expected: PASS (7 tests).

- [ ] **Step 4: Commit**

```bash
git add apps/api/test/auth.e2e-spec.ts apps/api/test/jest-e2e.json
git commit -m "test(api): add auth e2e coverage for login/refresh/me"
```

---

## Task 19: Final verification

- [ ] **Step 1: Full check**

Run (from repo root):

```bash
npm run check
npm test -w @claude-monorepo/api
npm run test:e2e -w @claude-monorepo/api
npm run build -w @claude-monorepo/api
```

Expected: Biome clean; all unit tests pass; all e2e tests pass; build succeeds.

- [ ] **Step 2: Manual smoke test (requires Postgres + seeded DB)**

```bash
npm run start:dev -w @claude-monorepo/api
# in another shell:
curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"root","password":"ChangeMe123!"}'
# copy accessToken, then:
curl -s localhost:3000/auth/me -H "Authorization: Bearer <accessToken>"
```

Expected: login returns `{accessToken, refreshToken}`; `me` returns the root profile without `password`.

- [ ] **Step 3: Update the spec status**

Edit `docs/superpowers/specs/auth/auth-module-design.md` and set `**Status:** Implemented`. Commit:

```bash
git add docs/superpowers/specs/auth/auth-module-design.md
git commit -m "docs(auth): mark auth module spec as implemented"
```

---

## Self-Review Notes (author check — already applied)

- **Spec coverage:** login/refresh/me (Tasks 13, 15, 18); User model + cuid (Task 2); bcrypt (Tasks 12, 17); stateless JWT w/ separate secrets + sliding refresh (Tasks 11, 13); Bearer delivery (Tasks 14, 15); seed root user, no register (Task 17); minimal foundation — DatabaseService (4), error classes + filter (5, 7), ValidationPipe (16), RequestIdMiddleware (6), JwtAuthGuard (14); error codes table (Task 5 + e2e assertions in 18); DDD layering (file structure); env vars (Task 1).
- **Out-of-scope honored:** no Redis, register, logging transport, swagger, asset storage.
- **Type consistency:** `UserRepository.findByUsername/findById`, `TokenService.signAccess/signRefresh/verifyAccess/verifyRefresh`, `PasswordHasher.compare`, `AuthService.login/refresh/getProfile`, `User.passwordHash/enabled/toProfile`, guard principal `{ userId, username, isRoot }`, DI tokens `USER_REPOSITORY`/`TOKEN_SERVICE`/`PASSWORD_HASHER` — all used consistently across tasks.
- **Known deviation:** e2e is hermetic (in-memory repo/hasher fakes) rather than against a real Postgres test DB; DB-backed integration e2e is a documented follow-up.
