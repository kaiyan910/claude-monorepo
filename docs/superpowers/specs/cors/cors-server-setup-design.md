# CORS Server Setup — Design

**Date:** 2026-06-06
**Status:** Approved
**Feature:** `cors`
**App:** `apps/api`

## Goal

Enable Cross-Origin Resource Sharing on the NestJS backend so the React +
Vite frontend (served from a different origin) can call the HTTP API. Today
`apps/api/src/main.ts` bootstraps with no CORS configuration, so browser
requests from the Vite dev origin to the API are blocked by the browser's
same-origin policy.

The allowed origin(s) must be configurable per environment, with a
zero-config default for local development.

## Decisions (from brainstorming)

| Concern | Decision |
| --- | --- |
| Allowed origins | **Env var + dev default** — a new `CORS_ORIGIN` env var holds a comma-separated origin list. When unset/empty, fall back to the Vite dev origin `http://localhost:5173` so local dev needs no extra setup; production sets the real origin(s). |
| Credentials (cookies) | **Disabled** (`credentials: false`). Auth is entirely Bearer-token based — both access and refresh tokens travel in the JSON body and the `Authorization` header; the frontend axios client sets no cookies and does not use `withCredentials`. No cookie support is needed today. |
| Where config lives | **Extracted pure builder** (approach A) — `buildCorsOptions(env)` in `src/config/cors.ts`, co-located spec, called from `main.ts`. Mirrors the existing `src/config/env.ts` (`requireEnv`) convention and keeps `main.ts` declarative. |
| Methods / allowed headers | **Rely on the `cors` package defaults** — default methods already cover `GET/HEAD/POST/PUT/PATCH/DELETE`; default `allowedHeaders` reflects the preflight `Access-Control-Request-Headers`, so `Authorization` and `Content-Type` are permitted automatically. Smallest correct MVP. |

## Scope

**In scope:**

- `buildCorsOptions(env: NodeJS.ProcessEnv): CorsOptions` in
  `src/config/cors.ts` — parses `CORS_ORIGIN` into a `string[]`, applies the
  dev fallback, sets `credentials: false`.
- Co-located TDD spec `src/config/cors.spec.ts`.
- `main.ts`: `app.enableCors(buildCorsOptions(process.env))`, placed after
  `useGlobalFilters` and before `setupOpenApi`.
- Document the new `CORS_ORIGIN` variable in `apps/api/.env.example` (and
  `.env` for local dev).

**Out of scope (YAGNI — defer):**

- `credentials: true` / cookie-based auth or refresh-token cookies.
- Dynamic `origin` callback functions or regex/wildcard origin matching.
- Per-route or per-controller CORS overrides.
- Configurable `methods`, `allowedHeaders`, `exposedHeaders`, `maxAge`.
- CORS for any non-HTTP transport (WebSocket/SSE).

## Architecture

A single pure function builds the options object; `main.ts` wires it in. This
follows the project's existing split: `config/` holds small, pure,
env-reading helpers (`env.ts`), tested in isolation, while `main.ts` stays a
thin, declarative bootstrap.

```
apps/api/src/
├ config/
│  ├ env.ts                  # existing — requireEnv()
│  ├ cors.ts                 # NEW — buildCorsOptions(env): CorsOptions
│  └ cors.spec.ts            # NEW — origin parsing + fallback + credentials
└ main.ts                    # + app.enableCors(buildCorsOptions(process.env))
```

### Data flow

```
process.env.CORS_ORIGIN
   └─▶ buildCorsOptions(env)            (src/config/cors.ts, pure)
          └─▶ CorsOptions { origin: string[], credentials: false }
                 └─▶ app.enableCors(...)   (src/main.ts)
                        └─▶ NestJS cors middleware sets the
                            Access-Control-Allow-* response headers
```

## Components

### 1. `src/config/cors.ts`

```typescript
import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

const DEFAULT_DEV_ORIGIN = "http://localhost:5173";

/**
 * Builds the CORS options from the environment. `CORS_ORIGIN` is a
 * comma-separated list of allowed origins; when unset or empty it falls back
 * to the Vite dev origin so local development needs no extra configuration.
 * Credentials are disabled — auth is Bearer-token based, so no cookies cross
 * origins.
 */
export function buildCorsOptions(env: NodeJS.ProcessEnv): CorsOptions {
  const origins = (env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return {
    origin: origins.length > 0 ? origins : [DEFAULT_DEV_ORIGIN],
    credentials: false,
  };
}
```

- Pure and synchronous → trivially unit-testable, no mocks.
- `methods` / `allowedHeaders` deliberately omitted to inherit the `cors`
  package defaults (see Decisions). `Authorization` is allowed because the
  default reflects the preflight's requested headers.

### 2. `src/main.ts`

Add one line in `bootstrap()`:

```typescript
app.useGlobalFilters(new CustomExceptionFilter());
app.enableCors(buildCorsOptions(process.env)); // NEW
await setupOpenApi(app);
```

Placement is between the global filter and OpenAPI setup; CORS is
app-level middleware and order relative to these is not significant, but this
keeps the wiring grouped with the other `app.*` bootstrap calls.

### 3. Environment

`apps/api/.env.example` (and local `.env`):

```
# Comma-separated list of browser origins allowed to call the API via CORS.
# Defaults to http://localhost:5173 (Vite dev server) when unset.
CORS_ORIGIN=http://localhost:5173
```

> Note: `.env*` files are currently blocked from direct read/write by the
> sandbox permission rules. If the implementation step cannot edit them, the
> change will be surfaced and added manually.

## Error handling

No new runtime error paths. CORS enforcement is performed by the browser based
on the response headers the `cors` middleware emits; a disallowed origin simply
does not receive `Access-Control-Allow-Origin`, and the browser blocks the
response. `buildCorsOptions` never throws — a missing `CORS_ORIGIN` is a valid
state that selects the dev default (intentionally not fail-fast, unlike
`DATABASE_URL`, because a sensible default exists).

## Testing (TDD — tests written first)

`src/config/cors.spec.ts` — `buildCorsOptions`:

- `CORS_ORIGIN` unset → `origin` is `["http://localhost:5173"]`.
- `CORS_ORIGIN` empty string → same dev fallback.
- single origin (`"https://app.example.com"`) → `["https://app.example.com"]`.
- comma-separated list with surrounding whitespace
  (`" https://a.com , https://b.com "`) → `["https://a.com", "https://b.com"]`
  (trimmed).
- empty entries (`"https://a.com,,https://b.com"`) → empties filtered out.
- `credentials` is always `false`.

Run `npm run test -w @claude-monorepo/api`; lint with `npm run check`.

An OPTIONS-preflight e2e test is intentionally deferred — the builder unit
tests plus NestJS's own `enableCors` cover the behaviour for this MVP.

## YAGNI / non-goals

No credentials/cookies, no dynamic origin callbacks, no wildcard/regex
matching, no per-route CORS, no customised methods/headers/maxAge, no
WebSocket/SSE CORS.
