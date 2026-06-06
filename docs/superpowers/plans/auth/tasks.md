# Auth Feature — Task Status

Login page wired to `POST /auth/login`. See the spec
(`docs/superpowers/specs/auth/auth-login-page-design.md`) and plan
(`docs/superpowers/plans/auth/auth-login-page.md`).

| Task | Description | Status |
| --- | --- | --- |
| 1 | Install deps + enable JSON imports | done |
| 2 | Navy brand theme + Inter | done |
| 3 | shadcn primitives (button/input/label/card) | done |
| 4 | Zustand auth store | done |
| 5 | Bearer axios interceptor | done |
| 6 | Response schemas + error code extraction | done |
| 7 | Auth API module | done |
| 8 | i18n setup + error map (zh-TW/en) | done |
| 9 | Login form Zod schema | done |
| 10 | use-login / use-me hooks + query keys | done |
| 11 | Login form component | done |
| 12 | Login page layout | done |
| 13 | Routes + guarded protected home | done |
| 14 | Verification + tracker | done |

## Verification (automated)

Run from `apps/frontend` (and `npm run check` from repo root):

- `npx tsc -b` — clean
- `npm run build` — succeeds
- `npm run test` — 29 tests across 10 files pass
- `npm run check` (root) — 0 Biome errors

## Manual smoke test (run against a live API — requires backend stack)

Not executed as part of this build (needs Postgres/Redis + seeded root user +
`SEED_ROOT_*` secrets). Procedure:

1. From repo root: `docker compose up -d` (Postgres + Redis), then seed the API
   (set `SEED_ROOT_USERNAME` / `SEED_ROOT_PASSWORD`, run the API seed).
2. Confirm `apps/frontend/.env` has `VITE_API_BASE_URL` pointing at the API.
3. `npm run dev` (root) starts api + web.
4. Visit the app → redirects to `/login`.
5. Wrong credentials → localized `errors.invalidCredentials` message.
6. Seeded root credentials → redirect to `/` with the greeting showing the
   user's name.
7. Sign out → redirect back to `/login`.
8. Reload while logged in → stays authenticated (persisted token).

## Deferred (follow-up tasks)

- Refresh-token rotation / silent refresh (`/auth/refresh` endpoint exists, not
  wired).
- Global 401 auto-logout interceptor across all feature queries.
- Register / forgot-password / MFA flows.
- Language switcher UI (default zh-TW, fallback en).
- Field-error live-region polish beyond `aria-describedby` (if assistive-tech
  testing surfaces gaps).

## Notes

- The per-commit hook formats but does not run lint/assist; full `npm run check`
  is the gate. A `style(frontend): satisfy biome check` cleanup commit resolved
  import-order + a label a11y suppression that the format-only hook missed.
