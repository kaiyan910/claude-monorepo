# API Documentation Setup — Design

**Date:** 2026-06-05
**Status:** Implemented
**Feature:** `api-documentation`
**App:** `apps/api`

## Goal

Set up OpenAPI documentation for the `api` service, fully compliant with
[docs/api/api-documentation.md](../../../api/api-documentation.md): generate the
OpenAPI spec with `@nestjs/swagger` and render it through **Scalar** as the API
reference UI. The existing `auth` feature (login / refresh / me) is decorated as
the reference example, establishing the conventions every later feature follows.

This is the follow-up the auth spec anticipated — its controllers and DTOs were
"structured cleanly so `@ApiProperty`/`@nestjs/swagger` decorators can be added
later without refactoring."

## Decisions (from brainstorming)

| Concern | Decision |
| --- | --- |
| Delivery scope | **Infrastructure + auth example** — install & wire Swagger/Scalar, build the document setup, add a reusable error-response DTO, and fully decorate the existing auth endpoints + DTOs as the reference. |
| Doc route exposure | **Non-production only** — the docs routes are mounted in dev/staging and skipped when `NODE_ENV === "production"`. |
| Response DTOs | **Convert to `@ApiProperty` classes** — `AuthResponseDto` / `MeResponseDto` change from `type` aliases (not introspectable by Swagger) to decorated presenter classes. |
| Scalar integration | **`@scalar/nestjs-api-reference`** `apiReference()` middleware, pointed at the served `/openapi.json`. |
| Setup structure | **Dedicated module + reusable error decorator** (approach A) — `core/openapi/` for bootstrap, `common/openapi/` for the shared error contract. |
| `@ApiProperty` strategy | **Explicit decorators** on every field (per api-documentation.md) — the swagger CLI plugin is not relied on. |

## Scope

**In scope:**

- Install `@nestjs/swagger` and `@scalar/nestjs-api-reference` in `apps/api`.
- `setupOpenApi(app)` bootstrap: DocumentBuilder config, `createDocument`,
  serve raw spec at `GET /openapi.json`, mount Scalar at `GET /reference`.
- Reusable `ErrorResponseDto` + `@ApiErrorResponses()` composed decorator.
- Convert `AuthResponseDto` / `MeResponseDto` to decorated classes; add
  `@ApiProperty` to `LoginDto` / `RefreshDto`.
- Decorate `AuthController` with `@ApiTags` / `@ApiOperation` / `@ApiOkResponse`
  / `@ApiBearerAuth` / `@ApiErrorResponses`, documenting every applicable error
  `code` per endpoint.
- Tests (TDD): openapi e2e, production-guard unit test, error-decorator unit test.
- `apps/api/README.md` note on where docs live and when they are enabled.

**Out of scope (YAGNI — defer):** Redis or any other feature, documenting
features beyond `auth`, publishing the spec in CI, Swagger's built-in Swagger-UI,
authentication/Basic-Auth in front of the docs route (non-production gating is
the chosen control), versioned/multi-document specs.

## Architecture

The setup splits by the project's existing layering distinction — `core/` holds
app-level infrastructure (like `database/`); `common/` holds cross-feature shared
building blocks (like `errors/`, `filters/`, `guards/`).

```
apps/api/src/
├ core/
│  └ openapi/
│     ├ setup-openapi.ts              # DocumentBuilder + createDocument + serve /openapi.json + mount Scalar; no-op in production
│     └ setup-openapi.spec.ts
├ common/
│  └ openapi/
│     ├ error-response.dto.ts         # ErrorResponseDto — @ApiProperty mirror of the standard error response
│     ├ api-error-responses.decorator.ts   # @ApiErrorResponses(...entries) → applyDecorators(@ApiResponse...)
│     └ api-error-responses.decorator.spec.ts
├ auth/infrastructure/presenter/http/
│  ├ auth.controller.ts               # + @ApiTags/@ApiOperation/@ApiOkResponse/@ApiBearerAuth/@ApiErrorResponses
│  └ dto/
│     ├ login.dto.ts                  # + @ApiProperty
│     ├ refresh.dto.ts                # + @ApiProperty
│     ├ auth-response.dto.ts          # type → class implements TokenPair, @ApiProperty
│     └ me-response.dto.ts            # type → class implements UserProfile, @ApiProperty
├ main.ts                             # await setupOpenApi(app) after useGlobalFilters
└ test/openapi.e2e-spec.ts
```

### Data flow

`main.ts` → `setupOpenApi(app)` → (non-production) `DocumentBuilder` config →
`SwaggerModule.createDocument(app, config)` walks the decorated controllers/DTOs
→ document object served at `/openapi.json` → Scalar middleware at `/reference`
fetches `/openapi.json` and renders the reference UI.

## Components

### 1. Packages

Add to `apps/api/package.json` dependencies:

- `@nestjs/swagger`
- `@scalar/nestjs-api-reference`

Both are runtime dependencies (decorators and the Scalar middleware run at
runtime).

### 2. `setup-openapi.ts`

```typescript
export async function setupOpenApi(app: INestApplication): Promise<void> {
  if (process.env.NODE_ENV === "production") return; // gate: no docs in prod

  const config = new DocumentBuilder()
    .setTitle("Claude Monorepo API")
    .setDescription("HTTP API for the claude-monorepo backend service.")
    .setVersion("0.0.1")
    .addBearerAuth() // JWT bearer scheme, referenced by @ApiBearerAuth()
    .addTag("auth", "Authentication endpoints")
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // raw spec for Scalar (and any external tooling)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get("/openapi.json", (_req, res) => res.json(document));

  // Scalar reference UI
  app.use("/reference", apiReference({ url: "/openapi.json" }));
}
```

- Production guard lives **inside** the function (unit-testable, and `main.ts`
  stays unconditional: it always calls `setupOpenApi`).
- Version is the static `0.0.1` for now (matches `apps/api/package.json`); wiring
  it to `package.json` automatically is a later nicety, not required here.

### 3. `ErrorResponseDto`

A class mirroring the `CustomExceptionFilter` output, so error responses get a
real schema in the spec.

```typescript
export class ErrorResponseDto {
  @ApiProperty({ example: 401 }) httpCode!: number;
  @ApiProperty({ example: "AUTH_INVALID_CREDENTIALS" }) code!: string;
  @ApiProperty({ example: "Invalid username or password" }) message!: string;
  @ApiProperty({ example: "87b9a4c3-6eaa-4553-aaee-5809729a13c3" }) traceId!: string;
  @ApiProperty({ example: "2026-06-05T00:00:00.000Z" }) createdAt!: string;
}
```

### 4. `@ApiErrorResponses()` decorator

Documents the applicable error `code`s per endpoint in one line, keeping
controllers readable while satisfying "document all applicable error `code`
values per endpoint."

```typescript
interface ApiErrorEntry { status: number; code: string; description?: string }

export function ApiErrorResponses(...entries: ApiErrorEntry[]) {
  return applyDecorators(
    ...entries.map((e) =>
      ApiResponse({
        status: e.status,
        description: e.description ?? e.code,
        type: ErrorResponseDto,
        example: { httpCode: e.status, code: e.code, message: "…", traceId: "…", createdAt: "…" },
      }),
    ),
  );
}
```

`ErrorResponseDto` is registered via `@ApiExtraModels(ErrorResponseDto)` (on the
decorator or controller) so it always appears in `components.schemas`.

### 5. Response DTO conversions

- `auth-response.dto.ts`: `type AuthResponseDto = TokenPair` → `class
  AuthResponseDto implements TokenPair` with `@ApiProperty accessToken` /
  `refreshToken`.
- `me-response.dto.ts`: `type MeResponseDto = UserProfile` → `class MeResponseDto
  implements UserProfile` with `@ApiProperty` for `id`, `name`, `username`,
  `email`, `isRoot`, `enabled`, `createdAt`, `updatedAt`.
- `login.dto.ts` / `refresh.dto.ts`: add `@ApiProperty({ example })` alongside the
  existing class-validator decorators.
- `auth.controller.ts`: change `import type { AuthResponseDto/MeResponseDto }` to a
  value `import` (decorators reference the class at runtime). Service return values
  (`TokenPair` / `UserProfile` plain objects) remain structurally assignable to the
  new classes — no service changes.

### 6. `AuthController` decorators (error codes verified against service + guard)

| Endpoint | Success | Error responses |
| --- | --- | --- |
| `POST /auth/login` | `200 AuthResponseDto` | `400 VALIDATION_ERROR`, `401 AUTH_INVALID_CREDENTIALS`, `403 AUTH_USER_DISABLED` |
| `POST /auth/refresh` | `200 AuthResponseDto` | `400 VALIDATION_ERROR`, `401 AUTH_INVALID_TOKEN`, `403 AUTH_USER_DISABLED` |
| `GET /auth/me` | `200 MeResponseDto` (`@ApiBearerAuth`) | `401 AUTH_UNAUTHORIZED`, `401 AUTH_INVALID_TOKEN` |

Class gets `@ApiTags("auth")`; each method gets `@ApiOperation({ summary })`.

## Error handling

No new runtime error paths — this is documentation. The only behavioural change
is the two new routes (`/openapi.json`, `/reference`), which exist solely in
non-production. They are mounted on the raw HTTP adapter / via `app.use`, so they
sit outside the Nest controller pipeline and are unaffected by the global
`ValidationPipe` and `CustomExceptionFilter`.

## Testing (TDD — tests written first)

- `test/openapi.e2e-spec.ts` (non-production):
  - `GET /openapi.json` → 200; body `.paths` contains `/auth/login`,
    `/auth/refresh`, `/auth/me`; `.components.securitySchemes` has the bearer
    scheme; the auth operations carry the documented error responses.
  - `GET /reference` → 200, returns HTML.
- `core/openapi/setup-openapi.spec.ts`: with `NODE_ENV=production`,
  `setupOpenApi` is a no-op — it neither registers `/openapi.json` nor mounts
  Scalar (assert via spies on the http adapter / `app.use`).
- `common/openapi/api-error-responses.decorator.spec.ts`: applying
  `@ApiErrorResponses({status,code})` attaches the expected swagger response
  metadata (`ErrorResponseDto` type + example with the `code`).

Run `npm run test -w @claude-monorepo/api` and `npm run test:e2e -w
@claude-monorepo/api`; lint with `npm run check`.

## Documentation

`apps/api/README.md`: short section — interactive reference at `/reference`, raw
spec at `/openapi.json`, available in non-production only; how to add docs to a
new feature (decorate controller + DTOs, reuse `@ApiErrorResponses`).

## YAGNI / non-goals

No CI spec publishing, no Swagger-UI, no auth gate on the docs route, no
multi-version documents, no auto-version-from-package.json, no decoration of
features other than `auth`.
