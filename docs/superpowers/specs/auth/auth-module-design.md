# Auth Module — Design

**Date:** 2026-06-05
**Status:** Implemented (pending initial Prisma migration + seed run on a Postgres environment)
**Feature:** `auth`
**App:** `apps/api`

## Goal

Deliver a simple authentication module for the `api` app, fully compliant with
the backend best practices in [docs/api.md](../../../api.md) and its referenced
convention docs under [docs/api/](../../../api/). This is the **first backend
feature**, so it also lays the minimal foundation (DB, error handling,
validation, tracing, JWT guard) that later features will reuse.

Three endpoints:

- `POST /auth/login` — obtain tokens
- `POST /auth/refresh` — exchange a refresh token for a new token pair
- `GET /auth/me` — retrieve the authenticated user's profile

## Decisions (from brainstorming)

| Concern | Decision |
| --- | --- |
| Foundation scope | **Auth-minimal subset** only (see §2). No Redis, logging transport, or asset storage this round. |
| Token strategy | **Stateless JWT** — signed access + refresh tokens, no server-side store. |
| Token delivery | **Response body + Bearer** — tokens returned in JSON; client sends `Authorization: Bearer <token>`. |
| User provisioning | **Prisma seed script** for one root user. **No** register endpoint. |
| Login credential | **`username` + `password`** (`email` stored but not used for login). |
| Refresh behaviour | **Sliding session** — `refresh` reissues a new access **and** refresh token pair. |
| Password hashing | **bcrypt**. |

## Scope

**In scope:** the three endpoints above and the minimal foundation to support
them.

**Out of scope (YAGNI — defer to follow-up tasks):** register, logout/token
revocation, Redis, password reset, role/permission system, structured logging
transport, asset storage, Swagger/Scalar docs. Controllers and DTOs will be
structured cleanly so `@ApiProperty`/`@nestjs/swagger` decorators can be added
later without refactoring.

## Architecture (DDD layering per api.md)

Two features: `user` (owns the user domain) and `auth` (verifies identity,
issues tokens). `auth` consumes `user` through a repository port — it never
touches Prisma directly. Dependencies point inward toward the domain core.

```
apps/api/src/
├ core/
│  └ database/
│     ├ database.module.ts
│     └ database.service.ts        # Prisma 7 + @prisma/adapter-pg, composition, getClient()
├ common/
│  ├ errors/                        # custom HttpException subclasses (readonly code)
│  ├ filters/custom-exception.filter.ts
│  ├ middleware/request-id.middleware.ts
│  └ guards/jwt-auth.guard.ts       # reads Bearer, verifies access token, injects req.user
├ user/
│  ├ domain/                        # User VO, Email/HashedPassword value-objects, user.factory
│  ├ application/
│  │  ├ user.repository.ts          # port (interface)
│  │  └ user.module.ts
│  └ infrastructure/
│     ├ persistence/user.mapper.ts + prisma-user.repository.ts
│     └ user-infrastructure.module.ts
├ auth/
│  ├ domain/                        # token payload value-objects
│  ├ application/
│  │  ├ token.service.ts            # port
│  │  ├ auth.service.ts             # login / refresh / getMe use cases
│  │  └ auth.module.ts
│  └ infrastructure/
│     ├ presenter/http/
│     │  ├ dto/ (login.dto.ts, refresh.dto.ts, auth-response.dto.ts, me-response.dto.ts)
│     │  └ auth.controller.ts
│     ├ jwt-token.service.ts        # @nestjs/jwt implementation of token.service port
│     └ auth-infrastructure.module.ts
├ app.module.ts
└ main.ts                           # global ValidationPipe + CustomExceptionFilter + RequestIdMiddleware
```

### Component responsibilities

- **`DatabaseService`** — constructs `PrismaClient` with a `PrismaPg` adapter
  (composition, not inheritance). Exposes `getClient()`. Bare `new
  PrismaClient()` is forbidden per database conventions.
- **`UserRepository` (port)** — `findByUsername(username)`, `findById(id)`.
  Returns a domain `User` (or null). Implemented by `PrismaUserRepository` in
  the infrastructure layer; `user.mapper.ts` maps the Prisma row ↔ domain `User`.
- **`TokenService` (port)** — `signAccess(payload)`, `signRefresh(payload)`,
  `verifyAccess(token)`, `verifyRefresh(token)`. Implemented by
  `JwtTokenService` using `@nestjs/jwt`.
- **`AuthService`** — orchestrates the three use cases. Holds no framework or
  Prisma details; depends only on `UserRepository` and `TokenService` ports.
- **`JwtAuthGuard`** — extracts the Bearer token, verifies it as an access
  token, attaches the decoded principal to `req.user`. Throws
  `AUTH_UNAUTHORIZED` / `AUTH_INVALID_TOKEN` on failure.

## Data model (Prisma schema)

`prisma/schema.prisma`, using the `@prisma/adapter-pg` driver adapter:

```prisma
model User {
  id         String   @id @default(cuid())
  name       String
  username   String   @unique
  password   String                          // bcrypt hash
  email      String   @unique
  isRoot     Boolean  @default(false) @map("is_root")
  enabled    Boolean  @default(true)
  createdAt  DateTime @default(now())  @map("created_at")
  updatedAt  DateTime @updatedAt       @map("updated_at")
  @@map("users")
}
```

Snake_case column mapping (`@map`) on the DB side, camelCase in the domain.

### Seeding

`prisma/seed.ts` creates one `isRoot: true` user, reading initial credentials
from env (`SEED_ROOT_USERNAME`, `SEED_ROOT_PASSWORD`, `SEED_ROOT_EMAIL`,
`SEED_ROOT_NAME`). The password is bcrypt-hashed. Idempotent (upsert by
username).

## Token strategy (stateless)

| Token | Payload | TTL (env) | Secret (env) |
| --- | --- | --- | --- |
| access | `{ sub, username, isRoot, type: 'access' }` | `ACCESS_TOKEN_TTL` (default `15m`) | `ACCESS_TOKEN_SECRET` |
| refresh | `{ sub, type: 'refresh' }` | `REFRESH_TOKEN_TTL` (default `7d`) | `REFRESH_TOKEN_SECRET` |

Config loaded via `@nestjs/config`. Separate secrets isolate the two token
types; the `type` claim is also checked on verification so an access token can
never be used where a refresh token is expected and vice versa.

## Data flow

- **login** — validate DTO → `findByUsername` → if user missing OR
  `enabled = false` OR bcrypt compare fails, throw the appropriate error → on
  success, sign and return `{ accessToken, refreshToken }` in the body.
- **refresh** — verify the refresh JWT (refresh secret + `type: 'refresh'`) →
  re-fetch the user, require it still exists and `enabled` → sign and return a
  **new** access + refresh pair (sliding session).
- **me** — `JwtAuthGuard` verifies the access token → look up the user by `sub`
  → return the profile **without** the password field.

## Error handling (per error-handling.md)

All errors are custom `HttpException` subclasses with a `readonly code`,
converted to the Standard Error Response (including `traceId`) by
`CustomExceptionFilter`. Controllers contain no `try/catch`. Infrastructure
wraps external calls and never leaks `PrismaClientKnownRequestError`.

| code | httpCode | When |
| --- | --- | --- |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong username/password or user not found (does not reveal which). |
| `AUTH_USER_DISABLED` | 403 | `enabled = false`. |
| `AUTH_INVALID_TOKEN` | 401 | Token invalid, expired, or wrong type. |
| `AUTH_UNAUTHORIZED` | 401 | Missing or malformed `Authorization` header. |

## Validation (per validation.md)

Request layer (DTOs) validates shape only via class-validator + global
`ValidationPipe`:

- `login.dto.ts` — `username` (non-empty string), `password` (non-empty string).
- `refresh.dto.ts` — `refreshToken` (non-empty JWT string).

Business rules (credential check, `enabled`, token type) live in the
application/domain layers, not the DTO.

## Testing (TDD — tests written before implementation)

- **Unit:**
  - `auth.service.spec` — login success / wrong credentials / disabled user;
    refresh success / invalid / disabled user; me success.
  - `jwt-token.service.spec` — sign/verify round-trip; rejects wrong type;
    rejects expired/invalid.
  - `jwt-auth.guard.spec` — valid token passes; missing/malformed/invalid token
    throws.
  - `user.mapper.spec` — Prisma row ↔ domain `User` mapping; password never
    surfaces in the profile shape.
  - Prisma and bcrypt mocked at the boundary.
- **E2E:** `test/auth.e2e-spec.ts` — all three endpoints, success and error
  paths, via supertest against a dedicated test database.

## Dependencies to add

**Runtime:** `@nestjs/jwt`, `@nestjs/config`, `@prisma/client`,
`@prisma/adapter-pg`, `pg`, `bcrypt`, `class-validator`, `class-transformer`.

**Dev:** `prisma`, `@types/bcrypt`, `@types/pg`.

## New npm scripts (apps/api)

Per api.md commands: `db:generate` (`prisma generate`), `db:migration`
(`prisma migrate deploy`, for applying migrations), and a `db:seed` hook that
runs `prisma/seed.ts`. Local schema iteration uses `npx prisma migrate dev`
directly.

## Environment variables

```
DATABASE_URL=
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
SEED_ROOT_USERNAME=
SEED_ROOT_PASSWORD=
SEED_ROOT_EMAIL=
SEED_ROOT_NAME=
```

## Verification

- `npm run build -w @claude-monorepo/api` compiles.
- `npm run test -w @claude-monorepo/api` passes (unit + e2e).
- `npm run lint` / `npm run check` clean (Biome).
- Seed creates the root user; `login` → `me` round-trips; `refresh` issues a new
  working pair; disabled/invalid paths return the documented error `code`s.
