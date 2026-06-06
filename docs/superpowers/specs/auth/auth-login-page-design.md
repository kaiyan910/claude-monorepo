# Auth Login Page — Design Spec

- **Date:** 2026-06-06
- **Feature:** `auth`
- **Status:** approved (design)
- **Author:** Claude + Kenny

## 1. Goal

Deliver the frontend login experience for `apps/frontend`, wired to the existing
`POST /auth/login` endpoint on the NestJS API. This is the **first real feature**
in the frontend (today it only ships a placeholder home page), so it also
bootstraps the foundational libraries mandated by `docs/frontend/*` (TanStack
Form, i18next, Zustand, shadcn/ui).

### Scope (agreed)

- Login page UI + integration with `POST /auth/login`.
- On success: persist the issued token pair, mark the session authenticated, and
  redirect to the home route.
- On error: map the API error `code` to a localized message and surface it.
- Minimal **protected home**: guard the index route, greet the user via
  `GET /auth/me`, and provide a logout action.
- Route guards both ways (`/login` ⇄ `/`).

### Out of scope (deferred to follow-up tasks)

- Refresh-token rotation / silent token refresh (the `/auth/refresh` endpoint
  exists but is not wired up here).
- Register / forgot-password / multi-factor flows.
- A generic auth-error global interceptor that auto-logs-out on 401 across all
  feature queries (only the login + me flows are covered now).

## 2. Architecture Decision — token & auth state

The API returns `{ accessToken, refreshToken }` in the **response body** (not a
cookie), so the frontend owns storage.

**Chosen: Zustand (`persist`) + axios request interceptor + TanStack Router
`beforeLoad` guards.**

- A Zustand store holds `accessToken`, `refreshToken`, and derived
  `isAuthenticated`, persisted to `localStorage` so a page refresh keeps the
  session.
- An axios request interceptor reads the access token from the store and sets
  the `Authorization: Bearer <token>` header.
- Route `beforeLoad` hooks enforce redirects in both directions.

Rejected alternatives:

- **In-memory only (no persist):** refresh logs the user out (we don't do token
  rotation in MVP) → poor UX.
- **httpOnly cookies:** requires backend `Set-Cookie` changes; the API returns
  tokens in the body, so this is out of scope.

This matches the backend's token-in-body design and the documented stack
(Zustand for shared state, TanStack Query for server state via custom hooks).

## 3. Visual Design — Navy professional brand

The user opted into a navy brand identity (this redefines the app's global
theme, replacing the current neutral grayscale shadcn tokens).

- **Layout:** desktop split view — left navy brand panel (logo, tagline, subtle
  gradient), right white login card centered. Mobile collapses to a single
  centered card column.
- **Palette** (written into `src/index.css` as oklch tokens, with light + dark
  variants):

  | Token | Hex | Role |
  | --- | --- | --- |
  | primary | `#1E3A5F` | navy brand / primary buttons |
  | secondary | `#2563EB` | secondary blue |
  | accent | `#059669` | green CTA accent |
  | destructive | `#DC2626` | errors |
  | background | `#F8FAFC` | app background |
  | foreground | `#0F172A` | primary text |

- **Typography:** Inter (`font-display: swap`; preload only required weights).
- **Components:** shadcn `button` / `input` / `label` / `card` (new-york style,
  neutral base already configured in `components.json`); lucide icons
  (show/hide eye, spinner, field icons).
- **Interaction & a11y:** visible focus rings, password show/hide toggle, submit
  loading state (button disabled + spinner), 150–300ms transitions,
  `prefers-reduced-motion` respected, touch targets ≥44px, contrast ≥4.5:1 in
  both themes.

## 4. File Structure (follows `docs/frontend/*` conventions)

New files:

```
src/
├ api/auth.api.ts                         # login()/getMe(); forwards AbortSignal
├ dto/responses/auth-response.res.ts      # Zod schema + z.infer (token pair)
├ dto/responses/me-response.res.ts        # Zod schema (user profile)
├ dto/responses/api-error.res.ts          # Zod schema for standard error body
├ schemas/login.schemas.ts                # login form Zod schema
├ hooks/use-login.ts                      # wraps useMutation
├ hooks/use-me.ts                         # wraps useQuery (/auth/me)
├ store/auth.store.ts                     # Zustand + persist
├ i18n/index.ts                           # i18next init
├ i18n/error-message.ts                   # API code → i18n key map
├ i18n/locales/en/auth.json
├ i18n/locales/zh-TW/auth.json
├ components/features/auth/login-form.tsx # TanStack Form form
├ components/features/auth/login-page.tsx # split-view layout
├ components/ui/{button,input,label,card}.tsx   # shadcn CLI generated
└ routes/login.tsx                        # /login route
```

Modified files:

- `src/lib/api-client.ts` — request interceptor attaches the bearer token.
- `src/lib/query-client.ts` — add `queryKeys.auth.me`.
- `src/index.css` — navy theme tokens (light + dark).
- `src/main.tsx` — initialize i18n before render.
- `src/routes/index.tsx` — `beforeLoad` auth guard; home shows user + logout.

## 5. Data Flow

**Login**

1. `login-form` submit → `use-login` mutation → `auth.api.login(credentials, signal)`
   (`apiClient.post('/auth/login')`).
2. Validate the response with `authResponseSchema.parse()`.
3. `authStore.setTokens(pair)` → `navigate({ to: '/' })`.

**Error**

- axios error → parse `error.response.data` with `apiErrorSchema` → read `code`
  → resolve i18n key → render near the form. The frontend uses `code` (not the
  raw `message`) for user-facing text, per the API error-handling contract.
- Network / unparseable errors fall back to `NETWORK_ERROR` / `UNKNOWN` keys.

**Guards**

- `/login` `beforeLoad`: if authenticated → redirect `/`.
- `/` `beforeLoad`: if not authenticated → redirect `/login`.

**Protected home**

- `use-me` fetches `GET /auth/me`, validated with `meResponseSchema`, to greet
  the user by name. Logout = `authStore.clear()` + `navigate({ to: '/login' })`.

## 6. Form & Validation (TanStack Form + Zod)

- Fields: `username` (required), `password` (required, with show/hide toggle).
- Field-level validators for single-field rules; form-level validator on submit.
- Both `onChange` and `onSubmit` validators defined.
- Mirrors the backend's shape-only validation (`@IsString` + `@IsNotEmpty`):
  non-empty username/password — no invented business rules on the client.
- `autocomplete="username"` / `current-password`; on submit error, focus the
  first invalid field.

## 7. i18n & Error Mapping

- Locales: `en` + `zh-TW`; default `zh-TW`, fallback `en`.
- `error-message.ts` maps API `code` → translation key:
  - `AUTH_INVALID_CREDENTIALS`, `AUTH_USER_DISABLED`, `VALIDATION_ERROR`
  - plus `NETWORK_ERROR` and `UNKNOWN` fallbacks.
- All visible strings come from i18next — no hard-coded UI text.

## 8. Testing (TDD — tests written first)

- `auth.store.test.ts` — `setTokens` / `clear`, persistence, `isAuthenticated`.
- `login-form.test.tsx` — validation errors, submit happy path, loading state,
  password show/hide, error-message rendering. Accessible queries
  (`getByRole` / `getByLabelText`), both success and error paths.
- `use-login` behavior — success + failure (mock `auth.api`).

## 9. Dependencies to Install

- `@tanstack/react-form`
- `zustand`
- `i18next`, `react-i18next`
- shadcn CLI: `button`, `input`, `label`, `card`

## 10. Open Risks / Notes

- Changing `index.css` recolors the whole app (accepted — establishes brand).
- localStorage token storage carries XSS exposure; acceptable for this stage and
  consistent with the token-in-body backend design. Revisit when refresh
  rotation / httpOnly is implemented.
- `tasks.md` for the `auth` feature will be created during the planning step,
  listing each atomic task with status (per `CLAUDE.md`).
