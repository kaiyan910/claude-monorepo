# CORS Feature — Task Status

Server-side CORS for `apps/api`. See the spec
(`docs/superpowers/specs/cors/cors-server-setup-design.md`) and plan
(`docs/superpowers/plans/cors/cors-server-setup.md`).

| Task | Description | Status |
| --- | --- | --- |
| 1 | `buildCorsOptions` env parser (TDD) | done |
| 2 | Wire `app.enableCors` into bootstrap | done |
| 3 | Document `CORS_ORIGIN` + task tracker | done |

## Verification (automated)

Run from repo root:

- `npm run test -w @claude-monorepo/api` — all tests pass (incl. 6 cors specs)
- `npm run build -w @claude-monorepo/api` — succeeds
- `npm run check` — 0 Biome errors

## Manual smoke test (requires backend stack + frontend)

1. Ensure `apps/api/.env` has `CORS_ORIGIN` unset or `http://localhost:5173`.
2. `npm run dev` (root) — starts api (`:3000`) + web (`:5173`).
3. In the browser at `http://localhost:5173`, perform a login — the
   `POST /auth/login` request succeeds (no CORS error in the console).
4. Set `CORS_ORIGIN=https://example.com`, restart the api, retry login from
   `http://localhost:5173` → browser blocks the response (CORS error),
   confirming the origin allow-list is enforced.

## Deferred (follow-up tasks)

- `credentials: true` / cookie-based refresh tokens.
- OPTIONS-preflight e2e test.
- Per-route CORS, custom methods/headers/maxAge, WebSocket/SSE CORS.
