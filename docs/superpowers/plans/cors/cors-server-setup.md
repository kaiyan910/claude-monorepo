# CORS Server Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable CORS on the NestJS API so the React + Vite frontend can call it cross-origin, with the allowed origin(s) configurable via a `CORS_ORIGIN` env var and a zero-config local-dev default.

**Architecture:** A pure, synchronous `buildCorsOptions(env)` helper in `apps/api/src/config/cors.ts` parses `CORS_ORIGIN` (comma-separated) into a `string[]`, falling back to `http://localhost:5173` when unset, and returns a `CorsOptions` with `credentials: false`. `main.ts` calls `app.enableCors(buildCorsOptions(process.env))`. Methods/headers inherit the `cors` package defaults, which already permit the `Authorization` header used by the Bearer-token auth.

**Tech Stack:** NestJS (`@nestjs/common` `enableCors`), TypeScript, Jest.

Spec: [docs/superpowers/specs/cors/cors-server-setup-design.md](../../specs/cors/cors-server-setup-design.md)

---

## File Structure

- **Create** `apps/api/src/config/cors.ts` — `buildCorsOptions(env): CorsOptions`. Single responsibility: turn the environment into a CORS options object. Pure, no side effects.
- **Create** `apps/api/src/config/cors.spec.ts` — co-located unit tests for the parsing + fallback + credentials behaviour.
- **Modify** `apps/api/src/main.ts` — add one `app.enableCors(...)` call in `bootstrap()`.
- **Modify** `apps/api/.env.example` (and local `.env`) — document `CORS_ORIGIN`.
- **Create/Update** `docs/superpowers/plans/cors/tasks.md` — feature task tracker.

Commands (run from repo root unless noted):
- Test one file: `npm run test -w @claude-monorepo/api -- src/config/cors.spec.ts`
- Test the api workspace: `npm run test -w @claude-monorepo/api`
- Lint/format check: `npm run check`

---

### Task 1: `buildCorsOptions` helper (TDD)

**Files:**
- Create: `apps/api/src/config/cors.ts`
- Test: `apps/api/src/config/cors.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/config/cors.spec.ts`:

```typescript
import { buildCorsOptions } from "@/config/cors";

describe("buildCorsOptions", () => {
	it("falls back to the Vite dev origin when CORS_ORIGIN is unset", () => {
		const options = buildCorsOptions({});
		expect(options.origin).toEqual(["http://localhost:5173"]);
	});

	it("falls back to the Vite dev origin when CORS_ORIGIN is empty", () => {
		const options = buildCorsOptions({ CORS_ORIGIN: "" });
		expect(options.origin).toEqual(["http://localhost:5173"]);
	});

	it("parses a single origin", () => {
		const options = buildCorsOptions({ CORS_ORIGIN: "https://app.example.com" });
		expect(options.origin).toEqual(["https://app.example.com"]);
	});

	it("parses a comma-separated list and trims whitespace", () => {
		const options = buildCorsOptions({
			CORS_ORIGIN: " https://a.com , https://b.com ",
		});
		expect(options.origin).toEqual(["https://a.com", "https://b.com"]);
	});

	it("filters out empty entries", () => {
		const options = buildCorsOptions({
			CORS_ORIGIN: "https://a.com,,https://b.com",
		});
		expect(options.origin).toEqual(["https://a.com", "https://b.com"]);
	});

	it("disables credentials", () => {
		const options = buildCorsOptions({});
		expect(options.credentials).toBe(false);
	});
});
```

> Note: the empty object `{}` and the literals are assignable to `NodeJS.ProcessEnv` (it has a `[key: string]: string | undefined` index signature), so no casts are needed.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -w @claude-monorepo/api -- src/config/cors.spec.ts`
Expected: FAIL — `Cannot find module '@/config/cors'` (the file does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `apps/api/src/config/cors.ts`:

```typescript
import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

const DEFAULT_DEV_ORIGIN = "http://localhost:5173";

/**
 * Builds the CORS options from the environment. `CORS_ORIGIN` is a
 * comma-separated list of allowed browser origins; when unset or empty it
 * falls back to the Vite dev origin so local development needs no extra
 * configuration. Credentials are disabled — auth is Bearer-token based, so no
 * cookies cross origins.
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -w @claude-monorepo/api -- src/config/cors.spec.ts`
Expected: PASS — 6 tests pass.

- [ ] **Step 5: Lint/format check**

Run: `npm run check`
Expected: 0 Biome errors for the two new files.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/config/cors.ts apps/api/src/config/cors.spec.ts
git commit -m "feat(api): add buildCorsOptions env parser"
```

---

### Task 2: Wire CORS into the application bootstrap

**Files:**
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Add the import and the `enableCors` call**

In `apps/api/src/main.ts`, add the import alongside the existing `@/` imports:

```typescript
import { buildCorsOptions } from "@/config/cors";
```

Then, in `bootstrap()`, add the `enableCors` call between the global filter and OpenAPI setup. The relevant region becomes:

```typescript
	app.useGlobalFilters(new CustomExceptionFilter());
	app.enableCors(buildCorsOptions(process.env));
	await setupOpenApi(app);
```

For reference, the full updated `main.ts`:

```typescript
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "@/app.module";
import { CustomExceptionFilter } from "@/common/filters/custom-exception.filter";
import { buildCorsOptions } from "@/config/cors";
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
	app.enableCors(buildCorsOptions(process.env));
	await setupOpenApi(app);
	await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
```

- [ ] **Step 2: Verify the app builds and the full api suite still passes**

Run: `npm run build -w @claude-monorepo/api`
Expected: build succeeds (no TypeScript errors — confirms the `CorsOptions` import path and `enableCors` signature are correct).

Run: `npm run test -w @claude-monorepo/api`
Expected: PASS — all existing tests plus the 6 new `cors.spec.ts` tests pass.

- [ ] **Step 3: Lint/format check**

Run: `npm run check`
Expected: 0 Biome errors (note the import is placed in alphabetical order — `@/config/cors` sorts before `@/core/openapi/...`).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/main.ts
git commit -m "feat(api): enable CORS in bootstrap"
```

---

### Task 3: Document the `CORS_ORIGIN` env var + task tracker

**Files:**
- Modify: `apps/api/.env.example`
- Modify: `apps/api/.env` (local only — not committed)
- Create: `docs/superpowers/plans/cors/tasks.md`

- [ ] **Step 1: Add `CORS_ORIGIN` to `apps/api/.env.example`**

Append the following block to `apps/api/.env.example`:

```
# Comma-separated list of browser origins allowed to call the API via CORS.
# Defaults to http://localhost:5173 (Vite dev server) when unset.
CORS_ORIGIN=http://localhost:5173
```

> **Permission note:** `.env*` files may be blocked from edits by the sandbox's permission rules. If the Write/Edit is denied, do **not** force it — surface the exact line above to the user and ask them to add it to `apps/api/.env.example` (and their local `apps/api/.env`) manually. This step is documentation-only and does not affect runtime behaviour (the code already defaults to the dev origin).

- [ ] **Step 2: Add the same line to the local `apps/api/.env`** (optional, local-only — skip if blocked)

- [ ] **Step 3: Create the feature task tracker**

Create `docs/superpowers/plans/cors/tasks.md`:

```markdown
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
```

- [ ] **Step 4: Final verification**

Run: `npm run test -w @claude-monorepo/api`
Expected: PASS.

Run: `npm run check`
Expected: 0 Biome errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/.env.example docs/superpowers/plans/cors/tasks.md
git commit -m "docs(cors): document CORS_ORIGIN and add task tracker"
```

(If `.env.example` could not be staged due to permission rules, commit only the tracker and note the manual `.env.example` follow-up.)

---

## Self-Review

**Spec coverage:**
- Env-var + dev-default origin → Task 1 (parser) + Task 3 (`.env.example`). ✅
- `credentials: false` → Task 1 (test + impl). ✅
- Extracted `config/cors.ts` builder + co-located spec → Task 1. ✅
- `main.ts` `enableCors` placement (after `useGlobalFilters`, before `setupOpenApi`) → Task 2. ✅
- Rely on `cors` defaults for methods/headers → no code needed; verified by build + documented in spec. ✅
- Testing list (6 cases) → Task 1 Step 1 covers all six. ✅

**Placeholder scan:** No TBD/TODO; all code and commands are concrete. The `.env` permission caveat is an explicit conditional instruction, not a placeholder. ✅

**Type consistency:** `buildCorsOptions(env: NodeJS.ProcessEnv): CorsOptions` is used identically in Task 1 (definition), Task 1 tests, and Task 2 (call site `buildCorsOptions(process.env)`). Return shape `{ origin: string[], credentials: false }` matches the assertions. ✅
