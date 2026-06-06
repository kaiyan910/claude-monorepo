# Auth Login Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a navy-branded login page in `apps/frontend` wired to `POST /auth/login`, persisting the token pair, guarding routes, and greeting the user on a protected home via `GET /auth/me`.

**Architecture:** Zustand (`persist`) auth store holds the token pair; an axios request interceptor attaches the bearer token; TanStack Router `beforeLoad` guards redirect `/login ⇄ /`. The form uses TanStack Form + Zod; all copy comes from i18next (zh-TW default, en fallback); API error `code`s map to localized messages.

**Tech Stack:** React 19 + Vite, TanStack Router/Query/Form, Zustand, Zod 4, i18next/react-i18next, Tailwind v4 + shadcn/ui (new-york), lucide-react.

**Spec:** `docs/superpowers/specs/auth/auth-login-page-design.md`

**Conventions reminders:**
- Files kebab-case with role suffix; imports via `@/` alias only.
- Biome: tab indent, double quotes. Run `npm run format` before each commit; the pre-commit hook runs `npm run check`.
- Run frontend commands from `apps/frontend`. Tests: `npm run test` (Vitest).
- No `any`; derive response types from Zod via `z.infer`; validate responses with `.parse()`.

---

## File Map

**Create**
- `apps/frontend/src/components/ui/button.tsx` — shadcn button (cva variants)
- `apps/frontend/src/components/ui/input.tsx` — shadcn input
- `apps/frontend/src/components/ui/label.tsx` — shadcn label
- `apps/frontend/src/components/ui/card.tsx` — shadcn card parts
- `apps/frontend/src/store/auth.store.ts` — Zustand persist auth store
- `apps/frontend/src/store/auth.store.test.ts`
- `apps/frontend/src/dto/responses/auth-response.res.ts` — token-pair schema
- `apps/frontend/src/dto/responses/me-response.res.ts` — user-profile schema
- `apps/frontend/src/dto/responses/api-error.res.ts` — standard error schema
- `apps/frontend/src/lib/api-error.ts` — `extractApiErrorCode()`
- `apps/frontend/src/lib/api-error.test.ts`
- `apps/frontend/src/api/auth.api.ts` — `login()`, `getMe()`
- `apps/frontend/src/api/auth.api.test.ts`
- `apps/frontend/src/i18n/index.ts` — i18next init
- `apps/frontend/src/i18n/error-message.ts` — code → key map
- `apps/frontend/src/i18n/error-message.test.ts`
- `apps/frontend/src/i18n/locales/en/auth.json`
- `apps/frontend/src/i18n/locales/zh-TW/auth.json`
- `apps/frontend/src/schemas/login.schemas.ts` — login form schema
- `apps/frontend/src/schemas/login.schemas.test.ts`
- `apps/frontend/src/hooks/use-login.ts`
- `apps/frontend/src/hooks/use-login.test.tsx`
- `apps/frontend/src/hooks/use-me.ts`
- `apps/frontend/src/components/features/auth/login-form.tsx`
- `apps/frontend/src/components/features/auth/login-form.test.tsx`
- `apps/frontend/src/components/features/auth/login-page.tsx`
- `apps/frontend/src/components/features/auth/login-page.test.tsx`
- `apps/frontend/src/routes/login.tsx`

**Modify**
- `apps/frontend/tsconfig.app.json` — add `resolveJsonModule`
- `apps/frontend/src/index.css` — navy theme tokens + Inter font
- `apps/frontend/src/lib/api-client.ts` — bearer interceptor
- `apps/frontend/src/lib/query-client.ts` — `queryKeys.auth.me`
- `apps/frontend/src/main.tsx` — import i18n before render
- `apps/frontend/src/routes/index.tsx` — auth guard
- `apps/frontend/src/components/features/home/home-page.tsx` — greet + logout
- `apps/frontend/src/components/features/home/home-page.test.tsx` — rewrite

---

## Task 1: Install dependencies & enable JSON imports

**Files:**
- Modify: `apps/frontend/tsconfig.app.json`
- Modify: `apps/frontend/package.json` (via npm install)

- [ ] **Step 1: Install runtime deps**

Run from `apps/frontend`:
```bash
npm install @tanstack/react-form zustand i18next react-i18next
```

- [ ] **Step 2: Enable JSON module resolution**

In `apps/frontend/tsconfig.app.json`, add `"resolveJsonModule": true` inside `compilerOptions` (next to `"skipLibCheck": true`):

```json
		"types": ["vite/client", "vitest/globals"],
		"skipLibCheck": true,
		"resolveJsonModule": true,
```

- [ ] **Step 3: Verify install + typecheck baseline**

Run: `cd apps/frontend && npx tsc -b`
Expected: no errors (the new deps resolve; existing code still compiles).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/package.json apps/frontend/tsconfig.app.json package-lock.json
git commit -m "chore(frontend): add form/i18n/state deps and enable json imports"
```

---

## Task 2: Navy brand theme + Inter font

**Files:**
- Modify: `apps/frontend/src/index.css`

- [ ] **Step 1: Replace the theme tokens**

Replace the entire contents of `apps/frontend/src/index.css` with the following. The palette is the spec's navy/green brand expressed in oklch, with light and dark variants. Inter is loaded with `font-display: swap`.

```css
@import "tailwindcss";
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

@custom-variant dark (&:is(.dark *));

:root {
	--radius: 0.625rem;
	--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;

	/* Navy professional brand (light) */
	--background: oklch(0.985 0.003 247);
	--foreground: oklch(0.21 0.04 265);
	--card: oklch(1 0 0);
	--card-foreground: oklch(0.21 0.04 265);
	--popover: oklch(1 0 0);
	--popover-foreground: oklch(0.21 0.04 265);
	--primary: oklch(0.36 0.06 256);
	--primary-foreground: oklch(0.985 0.003 247);
	--secondary: oklch(0.55 0.18 264);
	--secondary-foreground: oklch(0.985 0.003 247);
	--muted: oklch(0.96 0.004 247);
	--muted-foreground: oklch(0.5 0.03 257);
	--accent: oklch(0.6 0.12 163);
	--accent-foreground: oklch(0.985 0.003 247);
	--destructive: oklch(0.58 0.22 27);
	--border: oklch(0.92 0.006 247);
	--input: oklch(0.92 0.006 247);
	--ring: oklch(0.36 0.06 256);
}

.dark {
	--background: oklch(0.18 0.03 265);
	--foreground: oklch(0.985 0.003 247);
	--card: oklch(0.23 0.035 265);
	--card-foreground: oklch(0.985 0.003 247);
	--popover: oklch(0.23 0.035 265);
	--popover-foreground: oklch(0.985 0.003 247);
	--primary: oklch(0.7 0.1 256);
	--primary-foreground: oklch(0.18 0.03 265);
	--secondary: oklch(0.62 0.16 264);
	--secondary-foreground: oklch(0.985 0.003 247);
	--muted: oklch(0.28 0.03 265);
	--muted-foreground: oklch(0.72 0.03 257);
	--accent: oklch(0.68 0.12 163);
	--accent-foreground: oklch(0.18 0.03 265);
	--destructive: oklch(0.7 0.19 22);
	--border: oklch(1 0 0 / 12%);
	--input: oklch(1 0 0 / 15%);
	--ring: oklch(0.7 0.1 256);
}

@theme inline {
	--radius-sm: calc(var(--radius) - 4px);
	--radius-md: calc(var(--radius) - 2px);
	--radius-lg: var(--radius);
	--radius-xl: calc(var(--radius) + 4px);
	--font-sans: var(--font-sans);
	--color-background: var(--background);
	--color-foreground: var(--foreground);
	--color-card: var(--card);
	--color-card-foreground: var(--card-foreground);
	--color-popover: var(--popover);
	--color-popover-foreground: var(--popover-foreground);
	--color-primary: var(--primary);
	--color-primary-foreground: var(--primary-foreground);
	--color-secondary: var(--secondary);
	--color-secondary-foreground: var(--secondary-foreground);
	--color-muted: var(--muted);
	--color-muted-foreground: var(--muted-foreground);
	--color-accent: var(--accent);
	--color-accent-foreground: var(--accent-foreground);
	--color-destructive: var(--destructive);
	--color-border: var(--border);
	--color-input: var(--input);
	--color-ring: var(--ring);
}

@layer base {
	* {
		@apply border-border outline-ring/50;
	}

	body {
		@apply bg-background text-foreground;
		margin: 0;
		font-family: var(--font-sans);
	}
}
```

- [ ] **Step 2: Smoke-check the dev server boots**

Run: `cd apps/frontend && npm run build`
Expected: build succeeds (Tailwind compiles the new tokens; no CSS errors).

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/index.css
git commit -m "style(frontend): apply navy brand theme and inter font"
```

---

## Task 3: shadcn UI primitives (button, input, label, card)

These are self-contained shadcn new-york components using the existing `cn` helper and theme tokens — no Radix dependency needed for this feature.

**Files:**
- Create: `apps/frontend/src/components/ui/button.tsx`
- Create: `apps/frontend/src/components/ui/input.tsx`
- Create: `apps/frontend/src/components/ui/label.tsx`
- Create: `apps/frontend/src/components/ui/card.tsx`

- [ ] **Step 1: Create `button.tsx`**

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				accent: "bg-accent text-accent-foreground hover:bg-accent/90",
				outline:
					"border border-input bg-background hover:bg-muted hover:text-foreground",
				ghost: "hover:bg-muted hover:text-foreground",
			},
			size: {
				default: "h-11 px-5 py-2",
				sm: "h-9 px-3",
				icon: "h-10 w-10",
			},
		},
		defaultVariants: { variant: "default", size: "default" },
	},
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants>;

/** shadcn-style button. `variant`/`size` map to theme tokens via cva. */
export function Button({ className, variant, size, ...props }: ButtonProps) {
	return (
		<button
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { buttonVariants };
```

- [ ] **Step 2: Create `input.tsx`**

```tsx
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** shadcn-style text input. Height ≥44px for comfortable touch targets. */
export function Input({
	className,
	type = "text",
	...props
}: InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			type={type}
			className={cn(
				"flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}
```

- [ ] **Step 3: Create `label.tsx`**

```tsx
import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** shadcn-style label. Plain <label>; pair with input `id` via `htmlFor`. */
export function Label({
	className,
	...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
	return (
		<label
			className={cn(
				"text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
				className,
			)}
			{...props}
		/>
	);
}
```

- [ ] **Step 4: Create `card.tsx`**

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Card container. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"rounded-xl border border-border bg-card text-card-foreground shadow-sm",
				className,
			)}
			{...props}
		/>
	);
}

export function CardHeader({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
	);
}

export function CardTitle({
	className,
	...props
}: HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h1
			className={cn("text-2xl font-semibold tracking-tight", className)}
			{...props}
		/>
	);
}

export function CardDescription({
	className,
	...props
}: HTMLAttributes<HTMLParagraphElement>) {
	return (
		<p className={cn("text-sm text-muted-foreground", className)} {...props} />
	);
}

export function CardContent({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("p-6 pt-0", className)} {...props} />;
}
```

- [ ] **Step 5: Typecheck + commit**

Run: `cd apps/frontend && npx tsc -b`
Expected: no errors.

```bash
git add apps/frontend/src/components/ui
git commit -m "feat(frontend): add shadcn button/input/label/card primitives"
```

---

## Task 4: Auth store (Zustand persist) — TDD

**Files:**
- Create: `apps/frontend/src/store/auth.store.test.ts`
- Create: `apps/frontend/src/store/auth.store.ts`

- [ ] **Step 1: Write the failing test**

`apps/frontend/src/store/auth.store.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth.store";

describe("authStore", () => {
	beforeEach(() => {
		useAuthStore.getState().clear();
		localStorage.clear();
	});

	it("starts unauthenticated with null tokens", () => {
		const state = useAuthStore.getState();
		expect(state.accessToken).toBeNull();
		expect(state.refreshToken).toBeNull();
		expect(state.isAuthenticated).toBe(false);
	});

	it("setTokens stores the pair and marks authenticated", () => {
		useAuthStore
			.getState()
			.setTokens({ accessToken: "a.b.c", refreshToken: "r.e.f" });

		const state = useAuthStore.getState();
		expect(state.accessToken).toBe("a.b.c");
		expect(state.refreshToken).toBe("r.e.f");
		expect(state.isAuthenticated).toBe(true);
	});

	it("clear resets to the unauthenticated state", () => {
		useAuthStore
			.getState()
			.setTokens({ accessToken: "a", refreshToken: "r" });
		useAuthStore.getState().clear();

		const state = useAuthStore.getState();
		expect(state.accessToken).toBeNull();
		expect(state.isAuthenticated).toBe(false);
	});

	it("persists tokens to localStorage under 'auth-storage'", () => {
		useAuthStore
			.getState()
			.setTokens({ accessToken: "a", refreshToken: "r" });

		const raw = localStorage.getItem("auth-storage");
		expect(raw).toContain("a");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && npm run test -- auth.store`
Expected: FAIL — cannot find module `@/store/auth.store`.

- [ ] **Step 3: Implement the store**

`apps/frontend/src/store/auth.store.ts`:
```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type TokenPair = {
	accessToken: string;
	refreshToken: string;
};

type AuthState = {
	accessToken: string | null;
	refreshToken: string | null;
	isAuthenticated: boolean;
	setTokens: (tokens: TokenPair) => void;
	clear: () => void;
};

/**
 * Auth session store. Persists the issued JWT pair to localStorage so a page
 * refresh keeps the user signed in. `isAuthenticated` is the single source of
 * truth consumed by route guards and the axios interceptor.
 */
export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			accessToken: null,
			refreshToken: null,
			isAuthenticated: false,
			setTokens: ({ accessToken, refreshToken }) =>
				set({ accessToken, refreshToken, isAuthenticated: true }),
			clear: () =>
				set({
					accessToken: null,
					refreshToken: null,
					isAuthenticated: false,
				}),
		}),
		{ name: "auth-storage" },
	),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && npm run test -- auth.store`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/store
git commit -m "feat(frontend): add persisted zustand auth store"
```

---

## Task 5: Bearer-token axios interceptor

**Files:**
- Modify: `apps/frontend/src/lib/api-client.ts`

- [ ] **Step 1: Add the request interceptor**

Replace the contents of `apps/frontend/src/lib/api-client.ts` with:
```ts
import axios from "axios";
import { env } from "@/lib/env";
import { useAuthStore } from "@/store/auth.store";

/**
 * Shared Axios instance pointing at the NestJS backend. Feature API modules
 * (`*.api.ts`) should import this rather than constructing their own client.
 */
export const apiClient = axios.create({
	baseURL: env.VITE_API_BASE_URL,
	headers: { "Content-Type": "application/json" },
});

// Attach the current access token to every request. Reads the store
// imperatively so non-React callers (route guards, api modules) stay in sync.
apiClient.interceptors.request.use((config) => {
	const token = useAuthStore.getState().accessToken;
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});
```

- [ ] **Step 2: Typecheck + commit**

Run: `cd apps/frontend && npx tsc -b`
Expected: no errors.

```bash
git add apps/frontend/src/lib/api-client.ts
git commit -m "feat(frontend): attach bearer token via axios interceptor"
```

---

## Task 6: Response schemas + API error code extraction — TDD

**Files:**
- Create: `apps/frontend/src/dto/responses/auth-response.res.ts`
- Create: `apps/frontend/src/dto/responses/me-response.res.ts`
- Create: `apps/frontend/src/dto/responses/api-error.res.ts`
- Create: `apps/frontend/src/lib/api-error.ts`
- Create: `apps/frontend/src/lib/api-error.test.ts`

- [ ] **Step 1: Create the three response schemas**

`apps/frontend/src/dto/responses/auth-response.res.ts`:
```ts
import { z } from "zod";

/** `POST /auth/login` + `/auth/refresh` success body — the issued JWT pair. */
export const authResponseSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
```

`apps/frontend/src/dto/responses/me-response.res.ts`:
```ts
import { z } from "zod";

/** `GET /auth/me` success body. Dates arrive as ISO-8601 strings over JSON. */
export const meResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	username: z.string(),
	email: z.string(),
	isRoot: z.boolean(),
	enabled: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;
```

`apps/frontend/src/dto/responses/api-error.res.ts`:
```ts
import { z } from "zod";

/** Standard API error envelope produced by CustomExceptionFilter. */
export const apiErrorSchema = z.object({
	httpCode: z.number(),
	code: z.string(),
	message: z.string(),
	traceId: z.string(),
	createdAt: z.string(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
```

- [ ] **Step 2: Write the failing test for `extractApiErrorCode`**

`apps/frontend/src/lib/api-error.test.ts`:
```ts
import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { extractApiErrorCode } from "@/lib/api-error";

function axiosErrorWithData(data: unknown): AxiosError {
	const error = new AxiosError("Request failed");
	error.response = {
		data,
		status: 401,
		statusText: "Unauthorized",
		headers: {},
		config: { headers: new AxiosHeaders() },
	};
	return error;
}

describe("extractApiErrorCode", () => {
	it("returns the API code from a standard error body", () => {
		const error = axiosErrorWithData({
			httpCode: 401,
			code: "AUTH_INVALID_CREDENTIALS",
			message: "nope",
			traceId: "t-1",
			createdAt: "2026-06-06T00:00:00.000Z",
		});
		expect(extractApiErrorCode(error)).toBe("AUTH_INVALID_CREDENTIALS");
	});

	it("returns NETWORK_ERROR when there is no response", () => {
		expect(extractApiErrorCode(new AxiosError("Network Error"))).toBe(
			"NETWORK_ERROR",
		);
	});

	it("returns UNKNOWN for an unrecognized error body", () => {
		expect(extractApiErrorCode(axiosErrorWithData({ oops: true }))).toBe(
			"UNKNOWN",
		);
	});

	it("returns UNKNOWN for a non-axios error", () => {
		expect(extractApiErrorCode(new Error("boom"))).toBe("UNKNOWN");
	});
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/frontend && npm run test -- api-error`
Expected: FAIL — cannot find module `@/lib/api-error`.

- [ ] **Step 4: Implement `extractApiErrorCode`**

`apps/frontend/src/lib/api-error.ts`:
```ts
import axios from "axios";
import { apiErrorSchema } from "@/dto/responses/api-error.res";

/**
 * Normalizes any thrown value into a stable error `code` the UI can translate.
 * Prefers the backend's standard error envelope; falls back to NETWORK_ERROR
 * (no response) or UNKNOWN. The UI maps this code to copy — never the raw
 * message — per the API error-handling contract.
 */
export function extractApiErrorCode(error: unknown): string {
	if (axios.isAxiosError(error)) {
		const parsed = apiErrorSchema.safeParse(error.response?.data);
		if (parsed.success) {
			return parsed.data.code;
		}
		if (!error.response) {
			return "NETWORK_ERROR";
		}
	}
	return "UNKNOWN";
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/frontend && npm run test -- api-error`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/dto/responses apps/frontend/src/lib/api-error.ts apps/frontend/src/lib/api-error.test.ts
git commit -m "feat(frontend): add auth response schemas and api error code extraction"
```

---

## Task 7: Auth API module — TDD

**Files:**
- Create: `apps/frontend/src/api/auth.api.test.ts`
- Create: `apps/frontend/src/api/auth.api.ts`

- [ ] **Step 1: Write the failing test**

`apps/frontend/src/api/auth.api.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const get = vi.fn();
vi.mock("@/lib/api-client", () => ({
	apiClient: {
		post: (...args: unknown[]) => post(...args),
		get: (...args: unknown[]) => get(...args),
	},
}));

import { getMe, login } from "@/api/auth.api";

describe("auth.api", () => {
	beforeEach(() => {
		post.mockReset();
		get.mockReset();
	});

	it("login posts credentials and parses the token pair", async () => {
		post.mockResolvedValue({
			data: { accessToken: "a.b.c", refreshToken: "r.e.f" },
		});

		const result = await login({ username: "root", password: "pw" });

		expect(post).toHaveBeenCalledWith(
			"/auth/login",
			{ username: "root", password: "pw" },
			{ signal: undefined },
		);
		expect(result).toEqual({ accessToken: "a.b.c", refreshToken: "r.e.f" });
	});

	it("login throws when the response shape is invalid", async () => {
		post.mockResolvedValue({ data: { accessToken: 123 } });
		await expect(login({ username: "x", password: "y" })).rejects.toThrow();
	});

	it("getMe fetches and parses the profile, forwarding the signal", async () => {
		const controller = new AbortController();
		get.mockResolvedValue({
			data: {
				id: "u1",
				name: "Root",
				username: "root",
				email: "root@example.com",
				isRoot: true,
				enabled: true,
				createdAt: "2026-06-05T00:00:00.000Z",
				updatedAt: "2026-06-05T00:00:00.000Z",
			},
		});

		const result = await getMe(controller.signal);

		expect(get).toHaveBeenCalledWith("/auth/me", {
			signal: controller.signal,
		});
		expect(result.username).toBe("root");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && npm run test -- auth.api`
Expected: FAIL — cannot find module `@/api/auth.api`.

- [ ] **Step 3: Implement the API module**

`apps/frontend/src/api/auth.api.ts`:
```ts
import { apiClient } from "@/lib/api-client";
import {
	type AuthResponse,
	authResponseSchema,
} from "@/dto/responses/auth-response.res";
import {
	type MeResponse,
	meResponseSchema,
} from "@/dto/responses/me-response.res";

type Credentials = {
	username: string;
	password: string;
};

/**
 * `POST /auth/login`. RQ v5 mutations receive no signal, so `signal` is
 * optional here; the response is validated before reaching callers.
 */
export async function login(
	credentials: Credentials,
	signal?: AbortSignal,
): Promise<AuthResponse> {
	const { data } = await apiClient.post("/auth/login", credentials, { signal });
	return authResponseSchema.parse(data);
}

/** `GET /auth/me`. Forwards the TanStack Query signal for auto-cancellation. */
export async function getMe(signal?: AbortSignal): Promise<MeResponse> {
	const { data } = await apiClient.get("/auth/me", { signal });
	return meResponseSchema.parse(data);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && npm run test -- auth.api`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/api/auth.api.ts apps/frontend/src/api/auth.api.test.ts
git commit -m "feat(frontend): add auth api module with response validation"
```

---

## Task 8: i18n setup + error-message map — TDD

**Files:**
- Create: `apps/frontend/src/i18n/locales/en/auth.json`
- Create: `apps/frontend/src/i18n/locales/zh-TW/auth.json`
- Create: `apps/frontend/src/i18n/error-message.ts`
- Create: `apps/frontend/src/i18n/error-message.test.ts`
- Create: `apps/frontend/src/i18n/index.ts`

- [ ] **Step 1: Create the locale files**

`apps/frontend/src/i18n/locales/en/auth.json`:
```json
{
	"login": {
		"brandName": "claude-monorepo",
		"brandTagline": "Secure access to your workspace.",
		"title": "Sign in",
		"subtitle": "Enter your credentials to continue.",
		"usernameLabel": "Username",
		"usernamePlaceholder": "root",
		"passwordLabel": "Password",
		"passwordPlaceholder": "Your password",
		"showPassword": "Show password",
		"hidePassword": "Hide password",
		"submit": "Sign in",
		"submitting": "Signing in…"
	},
	"home": {
		"greeting": "Welcome back, {{name}}.",
		"loading": "Loading your profile…",
		"logout": "Sign out"
	},
	"errors": {
		"usernameRequired": "Username is required.",
		"passwordRequired": "Password is required.",
		"invalidCredentials": "Incorrect username or password.",
		"userDisabled": "This account is disabled.",
		"validation": "Please check the highlighted fields.",
		"network": "Cannot reach the server. Check your connection.",
		"unknown": "Something went wrong. Please try again."
	}
}
```

`apps/frontend/src/i18n/locales/zh-TW/auth.json`:
```json
{
	"login": {
		"brandName": "claude-monorepo",
		"brandTagline": "安全存取你的工作空間。",
		"title": "登入",
		"subtitle": "輸入帳號密碼以繼續。",
		"usernameLabel": "帳號",
		"usernamePlaceholder": "root",
		"passwordLabel": "密碼",
		"passwordPlaceholder": "你的密碼",
		"showPassword": "顯示密碼",
		"hidePassword": "隱藏密碼",
		"submit": "登入",
		"submitting": "登入中…"
	},
	"home": {
		"greeting": "歡迎回來，{{name}}。",
		"loading": "載入個人資料中…",
		"logout": "登出"
	},
	"errors": {
		"usernameRequired": "請輸入帳號。",
		"passwordRequired": "請輸入密碼。",
		"invalidCredentials": "帳號或密碼錯誤。",
		"userDisabled": "此帳號已被停用。",
		"validation": "請檢查標示的欄位。",
		"network": "無法連線到伺服器，請檢查網路。",
		"unknown": "發生錯誤，請再試一次。"
	}
}
```

- [ ] **Step 2: Write the failing test for the error map**

`apps/frontend/src/i18n/error-message.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { errorKeyFromCode } from "@/i18n/error-message";

describe("errorKeyFromCode", () => {
	it("maps known API codes to namespaced i18n keys", () => {
		expect(errorKeyFromCode("AUTH_INVALID_CREDENTIALS")).toBe(
			"errors.invalidCredentials",
		);
		expect(errorKeyFromCode("AUTH_USER_DISABLED")).toBe("errors.userDisabled");
		expect(errorKeyFromCode("VALIDATION_ERROR")).toBe("errors.validation");
		expect(errorKeyFromCode("NETWORK_ERROR")).toBe("errors.network");
	});

	it("falls back to the unknown key for unmapped codes", () => {
		expect(errorKeyFromCode("SOMETHING_ELSE")).toBe("errors.unknown");
		expect(errorKeyFromCode(undefined)).toBe("errors.unknown");
	});
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/frontend && npm run test -- error-message`
Expected: FAIL — cannot find module `@/i18n/error-message`.

- [ ] **Step 4: Implement the error map**

`apps/frontend/src/i18n/error-message.ts`:
```ts
/**
 * Maps backend API error `code`s to keys in the `auth` i18n namespace. The UI
 * resolves the returned key with `t()` so user-facing copy stays localized and
 * decoupled from the raw server message.
 */
const API_ERROR_KEYS: Record<string, string> = {
	AUTH_INVALID_CREDENTIALS: "errors.invalidCredentials",
	AUTH_USER_DISABLED: "errors.userDisabled",
	VALIDATION_ERROR: "errors.validation",
	NETWORK_ERROR: "errors.network",
	UNKNOWN: "errors.unknown",
};

export function errorKeyFromCode(code: string | undefined): string {
	if (code && code in API_ERROR_KEYS) {
		return API_ERROR_KEYS[code];
	}
	return API_ERROR_KEYS.UNKNOWN;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/frontend && npm run test -- error-message`
Expected: PASS (2 tests).

- [ ] **Step 6: Create the i18n init module**

`apps/frontend/src/i18n/index.ts`:
```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enAuth from "@/i18n/locales/en/auth.json";
import zhTWAuth from "@/i18n/locales/zh-TW/auth.json";

/**
 * App-wide i18next instance. Default locale is zh-TW with an en fallback; the
 * `auth` namespace is the default so feature code calls `t("login.title")`.
 */
void i18n.use(initReactI18next).init({
	resources: {
		en: { auth: enAuth },
		"zh-TW": { auth: zhTWAuth },
	},
	lng: "zh-TW",
	fallbackLng: "en",
	defaultNS: "auth",
	interpolation: { escapeValue: false },
});

export default i18n;
```

- [ ] **Step 7: Typecheck + commit**

Run: `cd apps/frontend && npx tsc -b`
Expected: no errors (JSON imports resolve thanks to Task 1).

```bash
git add apps/frontend/src/i18n
git commit -m "feat(frontend): add i18next setup with zh-TW/en auth locales"
```

---

## Task 9: Login form Zod schema — TDD

**Files:**
- Create: `apps/frontend/src/schemas/login.schemas.test.ts`
- Create: `apps/frontend/src/schemas/login.schemas.ts`

- [ ] **Step 1: Write the failing test**

`apps/frontend/src/schemas/login.schemas.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { loginSchema } from "@/schemas/login.schemas";

describe("loginSchema", () => {
	it("accepts a non-empty username and password", () => {
		const result = loginSchema.safeParse({
			username: "root",
			password: "pw",
		});
		expect(result.success).toBe(true);
	});

	it("rejects an empty username with the i18n key", () => {
		const result = loginSchema.safeParse({ username: "", password: "pw" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe("errors.usernameRequired");
		}
	});

	it("rejects an empty password with the i18n key", () => {
		const result = loginSchema.safeParse({ username: "root", password: "" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe("errors.passwordRequired");
		}
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && npm run test -- login.schemas`
Expected: FAIL — cannot find module `@/schemas/login.schemas`.

- [ ] **Step 3: Implement the schema**

`apps/frontend/src/schemas/login.schemas.ts`:
```ts
import { z } from "zod";

/**
 * Login form schema. Mirrors the backend's shape-only validation (non-empty
 * username/password). Messages are i18n keys in the `auth` namespace, resolved
 * with `t()` at render time.
 */
export const loginSchema = z.object({
	username: z.string().min(1, "errors.usernameRequired"),
	password: z.string().min(1, "errors.passwordRequired"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && npm run test -- login.schemas`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/schemas
git commit -m "feat(frontend): add login form zod schema"
```

---

## Task 10: Query keys + use-login / use-me hooks — TDD

**Files:**
- Modify: `apps/frontend/src/lib/query-client.ts`
- Create: `apps/frontend/src/hooks/use-login.test.tsx`
- Create: `apps/frontend/src/hooks/use-login.ts`
- Create: `apps/frontend/src/hooks/use-me.ts`

- [ ] **Step 1: Add the auth query key**

Replace the `queryKeys` export at the bottom of `apps/frontend/src/lib/query-client.ts` with:
```ts
/**
 * Centralized query keys. Custom hooks must reference these instead of
 * hard-coding key arrays inline, so cache invalidation stays consistent.
 */
export const queryKeys = {
	auth: {
		me: ["auth", "me"] as const,
	},
} as const;
```

- [ ] **Step 2: Write the failing test for `use-login`**

`apps/frontend/src/hooks/use-login.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLogin } from "@/hooks/use-login";
import { useAuthStore } from "@/store/auth.store";

const loginFn = vi.fn();
vi.mock("@/api/auth.api", () => ({
	login: (...args: unknown[]) => loginFn(...args),
}));

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigate,
}));

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	return (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
}

afterEach(() => {
	loginFn.mockReset();
	navigate.mockReset();
	useAuthStore.getState().clear();
});

describe("useLogin", () => {
	it("stores tokens and navigates home on success", async () => {
		loginFn.mockResolvedValue({ accessToken: "a", refreshToken: "r" });

		const { result } = renderHook(() => useLogin(), { wrapper });
		act(() => {
			result.current.mutate({ username: "root", password: "pw" });
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(useAuthStore.getState().isAuthenticated).toBe(true);
		expect(useAuthStore.getState().accessToken).toBe("a");
		expect(navigate).toHaveBeenCalledWith({ to: "/" });
	});

	it("does not authenticate when login fails", async () => {
		loginFn.mockRejectedValue(new Error("bad creds"));

		const { result } = renderHook(() => useLogin(), { wrapper });
		act(() => {
			result.current.mutate({ username: "root", password: "wrong" });
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(useAuthStore.getState().isAuthenticated).toBe(false);
		expect(navigate).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/frontend && npm run test -- use-login`
Expected: FAIL — cannot find module `@/hooks/use-login`.

- [ ] **Step 4: Implement `use-login.ts`**

`apps/frontend/src/hooks/use-login.ts`:
```ts
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { login } from "@/api/auth.api";
import type { LoginFormValues } from "@/schemas/login.schemas";
import { useAuthStore } from "@/store/auth.store";

/**
 * Sign-in mutation. On success it persists the token pair and redirects home;
 * callers read `isPending` / `isError` / `error` to drive the form UI.
 */
export function useLogin() {
	const setTokens = useAuthStore((state) => state.setTokens);
	const navigate = useNavigate();

	return useMutation({
		mutationFn: (credentials: LoginFormValues) => login(credentials),
		onSuccess: (tokens) => {
			setTokens(tokens);
			void navigate({ to: "/" });
		},
	});
}
```

- [ ] **Step 5: Implement `use-me.ts`**

`apps/frontend/src/hooks/use-me.ts`:
```ts
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/api/auth.api";
import { queryKeys } from "@/lib/query-client";

/** Fetches the authenticated user's profile for the protected home screen. */
export function useMe() {
	return useQuery({
		queryKey: queryKeys.auth.me,
		queryFn: ({ signal }) => getMe(signal),
	});
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/frontend && npm run test -- use-login`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/lib/query-client.ts apps/frontend/src/hooks
git commit -m "feat(frontend): add use-login and use-me hooks with query keys"
```

---

## Task 11: Login form component — TDD

**Files:**
- Create: `apps/frontend/src/components/features/auth/login-form.test.tsx`
- Create: `apps/frontend/src/components/features/auth/login-form.tsx`

Tests mock `react-i18next` (identity `t` returning keys) and `@/hooks/use-login` (controllable) so assertions stay stable and isolated from the network/router.

- [ ] **Step 1: Write the failing test**

`apps/frontend/src/components/features/auth/login-form.test.tsx`:
```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/features/auth/login-form";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const mutate = vi.fn();
const useLoginMock = vi.fn();
vi.mock("@/hooks/use-login", () => ({
	useLogin: () => useLoginMock(),
}));

function setLoginState(
	overrides: Partial<{ isPending: boolean; isError: boolean; error: unknown }>,
) {
	useLoginMock.mockReturnValue({
		mutate,
		isPending: false,
		isError: false,
		error: null,
		...overrides,
	});
}

afterEach(() => {
	mutate.mockReset();
	useLoginMock.mockReset();
});

describe("LoginForm", () => {
	it("shows validation errors when submitting empty fields", async () => {
		setLoginState({});
		const user = userEvent.setup();
		render(<LoginForm />);

		await user.click(screen.getByRole("button", { name: "login.submit" }));

		expect(
			await screen.findByText("errors.usernameRequired"),
		).toBeInTheDocument();
		expect(screen.getByText("errors.passwordRequired")).toBeInTheDocument();
		expect(mutate).not.toHaveBeenCalled();
	});

	it("submits the credentials when valid", async () => {
		setLoginState({});
		const user = userEvent.setup();
		render(<LoginForm />);

		await user.type(screen.getByLabelText("login.usernameLabel"), "root");
		await user.type(screen.getByLabelText("login.passwordLabel"), "pw");
		await user.click(screen.getByRole("button", { name: "login.submit" }));

		await waitFor(() =>
			expect(mutate).toHaveBeenCalledWith({ username: "root", password: "pw" }),
		);
	});

	it("toggles password visibility", async () => {
		setLoginState({});
		const user = userEvent.setup();
		render(<LoginForm />);

		const password = screen.getByLabelText("login.passwordLabel");
		expect(password).toHaveAttribute("type", "password");

		await user.click(
			screen.getByRole("button", { name: "login.showPassword" }),
		);
		expect(password).toHaveAttribute("type", "text");
	});

	it("disables the submit button while pending", () => {
		setLoginState({ isPending: true });
		render(<LoginForm />);

		expect(screen.getByRole("button", { name: "login.submit" })).toBeDisabled();
	});

	it("renders a mapped server error", () => {
		setLoginState({
			isError: true,
			error: {
				isAxiosError: true,
				response: { data: { code: "AUTH_INVALID_CREDENTIALS" } },
			},
		});
		render(<LoginForm />);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"errors.invalidCredentials",
		);
	});
});
```

> Note: the server-error test relies on `extractApiErrorCode` reading `error.response.data.code`. `axios.isAxiosError` checks the `isAxiosError` flag, which the mock sets.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && npm run test -- login-form`
Expected: FAIL — cannot find module `@/components/features/auth/login-form`.

- [ ] **Step 3: Implement the form**

`apps/frontend/src/components/features/auth/login-form.tsx`:
```tsx
import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-login";
import { errorKeyFromCode } from "@/i18n/error-message";
import { extractApiErrorCode } from "@/lib/api-error";
import { loginSchema } from "@/schemas/login.schemas";

/** First validation message for a field, tolerant of string or Zod-issue shapes. */
function firstError(errors: unknown[]): string | undefined {
	const first = errors[0];
	if (typeof first === "string") {
		return first;
	}
	if (first && typeof first === "object" && "message" in first) {
		return String((first as { message: unknown }).message);
	}
	return undefined;
}

/**
 * Username/password sign-in form. TanStack Form + Zod drive validation; the
 * useLogin mutation handles persistence + redirect. All copy is localized.
 */
export function LoginForm() {
	const { t } = useTranslation();
	const { mutate, isPending, isError, error } = useLogin();
	const [showPassword, setShowPassword] = useState(false);

	const form = useForm({
		defaultValues: { username: "", password: "" },
		validators: { onChange: loginSchema, onSubmit: loginSchema },
		onSubmit: ({ value }) => {
			mutate(value);
		},
	});

	return (
		<form
			noValidate
			className="flex flex-col gap-5"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			{isError ? (
				<p
					role="alert"
					aria-live="polite"
					className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					{t(errorKeyFromCode(extractApiErrorCode(error)))}
				</p>
			) : null}

			<form.Field name="username">
				{(field) => {
					const message = firstError(field.state.meta.errors);
					return (
						<div className="flex flex-col gap-2">
							<Label htmlFor="username">{t("login.usernameLabel")}</Label>
							<Input
								id="username"
								name={field.name}
								autoComplete="username"
								placeholder={t("login.usernamePlaceholder")}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={message ? true : undefined}
							/>
							{message ? (
								<p className="text-sm text-destructive">{t(message)}</p>
							) : null}
						</div>
					);
				}}
			</form.Field>

			<form.Field name="password">
				{(field) => {
					const message = firstError(field.state.meta.errors);
					return (
						<div className="flex flex-col gap-2">
							<Label htmlFor="password">{t("login.passwordLabel")}</Label>
							<div className="relative">
								<Input
									id="password"
									name={field.name}
									type={showPassword ? "text" : "password"}
									autoComplete="current-password"
									placeholder={t("login.passwordPlaceholder")}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									aria-invalid={message ? true : undefined}
									className="pr-11"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((shown) => !shown)}
									aria-label={t(
										showPassword ? "login.hidePassword" : "login.showPassword",
									)}
									className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
								>
									{showPassword ? (
										<EyeOff className="size-5" aria-hidden="true" />
									) : (
										<Eye className="size-5" aria-hidden="true" />
									)}
								</button>
							</div>
							{message ? (
								<p className="text-sm text-destructive">{t(message)}</p>
							) : null}
						</div>
					);
				}}
			</form.Field>

			<form.Subscribe selector={(state) => state.canSubmit}>
				{(canSubmit) => (
					<Button
						type="submit"
						disabled={!canSubmit || isPending}
						aria-busy={isPending}
						className="mt-1 w-full"
					>
						{isPending ? (
							<Loader2 className="size-4 animate-spin" aria-hidden="true" />
						) : null}
						{t(isPending ? "login.submitting" : "login.submit")}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
```

> Implementation note: the submit button keeps the accessible name `login.submit` only while idle; the "disabled while pending" test sets `isPending: true`, which switches the label to `login.submitting`. Adjust that test's button query to `name: "login.submitting"` if you keep the label swap — OR keep the label fixed. **Decision for this plan: keep the label swapping and update the pending test query accordingly** (see Step 4).

- [ ] **Step 4: Fix the pending-state test query**

In `login-form.test.tsx`, change the "disables the submit button while pending" test to query the submitting label:
```tsx
	it("disables the submit button while pending", () => {
		setLoginState({ isPending: true });
		render(<LoginForm />);

		expect(
			screen.getByRole("button", { name: "login.submitting" }),
		).toBeDisabled();
	});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/frontend && npm run test -- login-form`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/components/features/auth/login-form.tsx apps/frontend/src/components/features/auth/login-form.test.tsx
git commit -m "feat(frontend): add login form with tanstack form + zod validation"
```

---

## Task 12: Login page layout — TDD

**Files:**
- Create: `apps/frontend/src/components/features/auth/login-page.test.tsx`
- Create: `apps/frontend/src/components/features/auth/login-page.tsx`

- [ ] **Step 1: Write the failing test**

`apps/frontend/src/components/features/auth/login-page.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "@/components/features/auth/login-page";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/features/auth/login-form", () => ({
	LoginForm: () => <div data-testid="login-form" />,
}));

describe("LoginPage", () => {
	it("renders the brand, title, and the login form", () => {
		render(<LoginPage />);

		expect(
			screen.getByRole("heading", { name: "login.title" }),
		).toBeInTheDocument();
		expect(screen.getByText("login.brandTagline")).toBeInTheDocument();
		expect(screen.getByTestId("login-form")).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && npm run test -- login-page`
Expected: FAIL — cannot find module `@/components/features/auth/login-page`.

- [ ] **Step 3: Implement the page**

`apps/frontend/src/components/features/auth/login-page.tsx`:
```tsx
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LoginForm } from "@/components/features/auth/login-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

/**
 * Split-view login screen: navy brand panel (desktop) + centered card form.
 * Collapses to a single centered column on small screens.
 */
export function LoginPage() {
	const { t } = useTranslation();

	return (
		<div className="grid min-h-dvh lg:grid-cols-2">
			<aside className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
				<div className="flex items-center gap-2 font-semibold text-lg">
					<ShieldCheck className="size-6" aria-hidden="true" />
					<span>{t("login.brandName")}</span>
				</div>
				<p className="max-w-sm text-2xl font-semibold leading-snug text-balance">
					{t("login.brandTagline")}
				</p>
				<span className="text-sm text-primary-foreground/70">
					© claude-monorepo
				</span>
			</aside>

			<main className="flex items-center justify-center p-6">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>{t("login.title")}</CardTitle>
						<CardDescription>{t("login.subtitle")}</CardDescription>
					</CardHeader>
					<CardContent>
						<LoginForm />
					</CardContent>
				</Card>
			</main>
		</div>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && npm run test -- login-page`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/features/auth/login-page.tsx apps/frontend/src/components/features/auth/login-page.test.tsx
git commit -m "feat(frontend): add navy split-view login page layout"
```

---

## Task 13: Routes (login + guarded home) and protected home page

**Files:**
- Create: `apps/frontend/src/routes/login.tsx`
- Modify: `apps/frontend/src/routes/index.tsx`
- Modify: `apps/frontend/src/components/features/home/home-page.tsx`
- Modify: `apps/frontend/src/components/features/home/home-page.test.tsx`
- Modify: `apps/frontend/src/main.tsx`

- [ ] **Step 1: Create the `/login` route with a reverse guard**

`apps/frontend/src/routes/login.tsx`:
```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginPage } from "@/components/features/auth/login-page";
import { useAuthStore } from "@/store/auth.store";

export const Route = createFileRoute("/login")({
	beforeLoad: () => {
		if (useAuthStore.getState().isAuthenticated) {
			throw redirect({ to: "/" });
		}
	},
	component: LoginPage,
});
```

- [ ] **Step 2: Guard the index route**

Replace `apps/frontend/src/routes/index.tsx` with:
```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { HomePage } from "@/components/features/home/home-page";
import { useAuthStore } from "@/store/auth.store";

export const Route = createFileRoute("/")({
	beforeLoad: () => {
		if (!useAuthStore.getState().isAuthenticated) {
			throw redirect({ to: "/login" });
		}
	},
	component: HomePage,
});
```

- [ ] **Step 3: Rewrite the protected home page test**

`apps/frontend/src/components/features/home/home-page.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "@/components/features/home/home-page";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, opts?: { name?: string }) =>
			opts?.name ? `${key}:${opts.name}` : key,
	}),
}));

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigate,
}));

const clear = vi.fn();
vi.mock("@/store/auth.store", () => ({
	useAuthStore: (selector: (s: { clear: () => void }) => unknown) =>
		selector({ clear }),
}));

const useMeMock = vi.fn();
vi.mock("@/hooks/use-me", () => ({
	useMe: () => useMeMock(),
}));

afterEach(() => {
	navigate.mockReset();
	clear.mockReset();
	useMeMock.mockReset();
});

describe("HomePage", () => {
	it("greets the authenticated user by name", () => {
		useMeMock.mockReturnValue({ data: { name: "Root" }, isLoading: false });
		render(<HomePage />);

		expect(screen.getByText("home.greeting:Root")).toBeInTheDocument();
	});

	it("logs out: clears the store and navigates to /login", async () => {
		useMeMock.mockReturnValue({ data: { name: "Root" }, isLoading: false });
		const user = userEvent.setup();
		render(<HomePage />);

		await user.click(screen.getByRole("button", { name: "home.logout" }));

		expect(clear).toHaveBeenCalledTimes(1);
		expect(navigate).toHaveBeenCalledWith({ to: "/login" });
	});
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd apps/frontend && npm run test -- home-page`
Expected: FAIL — current `HomePage` has no greeting/logout (assertions fail).

- [ ] **Step 5: Implement the protected home page**

Replace `apps/frontend/src/components/features/home/home-page.tsx` with:
```tsx
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { useAuthStore } from "@/store/auth.store";

/**
 * Protected home. Greets the signed-in user (via GET /auth/me) and offers a
 * logout action. The index route guard redirects here only when authenticated.
 */
export function HomePage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const clear = useAuthStore((state) => state.clear);
	const { data: user, isLoading } = useMe();

	function handleLogout() {
		clear();
		void navigate({ to: "/login" });
	}

	return (
		<main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
			<h1 className="font-bold text-4xl tracking-tight">claude-monorepo</h1>
			<p className="text-muted-foreground">
				{isLoading
					? t("home.loading")
					: t("home.greeting", { name: user?.name ?? "" })}
			</p>
			<Button variant="outline" onClick={handleLogout}>
				{t("home.logout")}
			</Button>
		</main>
	);
}
```

- [ ] **Step 6: Initialize i18n at app startup**

In `apps/frontend/src/main.tsx`, add the i18n side-effect import. Place it with the other imports, before `./index.css`:
```tsx
import { queryClient } from "@/lib/query-client";
import { router } from "@/router";
import "@/i18n";
import "./index.css";
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd apps/frontend && npm run test -- home-page`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/routes apps/frontend/src/components/features/home apps/frontend/src/main.tsx
git commit -m "feat(frontend): add login route and guarded protected home"
```

---

## Task 14: Full verification + feature task tracker

**Files:**
- Create: `docs/superpowers/plans/auth/tasks.md`

- [ ] **Step 1: Run the whole frontend test suite**

Run: `cd apps/frontend && npm run test`
Expected: all suites PASS.

- [ ] **Step 2: Typecheck + lint/format check + build**

Run: `cd apps/frontend && npx tsc -b && npm run build`
Then from repo root: `npm run check`
Expected: build succeeds; Biome reports no errors (run `npm run format` first if it flags formatting).

- [ ] **Step 3: Manual smoke test against the API**

1. Ensure Postgres/Redis are up (`docker compose up -d` from repo root) and the API is seeded (`SEED_ROOT_USERNAME` / `SEED_ROOT_PASSWORD` set; run the API's seed per `apps/api`).
2. Confirm `apps/frontend/.env` has `VITE_API_BASE_URL` pointing at the API.
3. Run `npm run dev` from repo root (starts api + web).
4. Visit the app → expect redirect to `/login`.
5. Submit wrong credentials → expect the localized `errors.invalidCredentials` message.
6. Submit the seeded root credentials → expect redirect to `/` with the greeting showing the user's name.
7. Click "登出/Sign out" → expect redirect back to `/login`.
8. Reload while logged in → expect to stay authenticated (persisted token).

- [ ] **Step 4: Create the feature task tracker**

`docs/superpowers/plans/auth/tasks.md`:
```markdown
# Auth Feature — Task Status

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

Deferred (follow-up tasks): refresh-token rotation, global 401 auto-logout,
register / forgot-password, language switcher UI.
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/auth/tasks.md
git commit -m "docs(auth): add feature task tracker and mark login page done"
```

---

## Self-Review Notes (for the implementer)

- **Spec coverage:** scope (login + persist + redirect + guards + protected home via `/auth/me`) → Tasks 4/5/10/13; navy theme → Task 2; TanStack Form + Zod → Tasks 9/11; i18n zh-TW/en + code mapping → Task 8; response Zod validation → Tasks 6/7; tests-first throughout.
- **Type consistency:** `setTokens({ accessToken, refreshToken })`, `clear()`, `isAuthenticated`, `queryKeys.auth.me`, `extractApiErrorCode`, `errorKeyFromCode`, `loginSchema`/`LoginFormValues`, `login()`/`getMe()` are defined once and reused with identical signatures.
- **Known framework behaviors:** RQ v5 mutations get no `signal` (login omits it; `getMe` forwards the query signal). TanStack Form errors from a Zod validator are issue objects → `firstError()` unwraps `.message`. Route `beforeLoad` reads the store via `getState()` (outside React) — correct for Zustand.
- **Deferred (not in scope):** token refresh rotation, global 401 interceptor, register/forgot-password, language switcher.
