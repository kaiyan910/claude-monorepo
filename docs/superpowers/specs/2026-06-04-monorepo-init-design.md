# Monorepo Init — Design

**Date:** 2026-06-04
**Status:** Approved

## Goal

Initialize the empty project folder as a TypeScript monorepo containing two
applications: `api` and `frontend`. Keep the scaffold minimal — framework
defaults left intact, no extra packages or tooling beyond what ties the
workspaces together.

## Stack decisions

| Concern        | Choice                          |
| -------------- | ------------------------------- |
| Language       | TypeScript                      |
| Monorepo tool  | npm workspaces                  |
| Frontend       | React + Vite (TS template)      |
| API            | NestJS                          |

## Layout

```
claude-monorepo/
├── package.json            # private root: workspaces ["apps/*"] + scripts
├── tsconfig.base.json      # shared compiler options (both apps extend)
├── .gitignore              # already present
└── apps/
    ├── api/                # NestJS default scaffold
    └── frontend/           # React + Vite default scaffold (react-ts)
```

## Root `package.json`

- `private: true`, `workspaces: ["apps/*"]`.
- One root devDependency: `concurrently` (run both dev servers at once).
- Scripts:
  - `dev` — run `dev:api` and `dev:frontend` in parallel via `concurrently`.
  - `dev:api` — `npm run start:dev -w @claude-monorepo/api`.
  - `dev:frontend` — `npm run dev -w @claude-monorepo/frontend`.
  - `build` — `npm run build --workspaces --if-present`.
  - `lint` — `npm run lint --workspaces --if-present`.
  - `test` — `npm run test --workspaces --if-present`.

## apps/api (NestJS)

- Generated from the NestJS default scaffold (`nest new`), no install at
  scaffold time — a single hoisted install runs from the root afterward.
- Package name: `@claude-monorepo/api`.
- Default `AppController` / `AppService` left as-is.
- Listens on port `3000` (Nest default).
- Jest preconfigured (Nest default).

## apps/frontend (React + Vite)

- Generated from the Vite `react-ts` template.
- Package name: `@claude-monorepo/frontend`.
- Default starter `App.tsx` left as-is.
- Vite dev server on port `5173` (default). No API proxy added.

## Shared TypeScript config

- `tsconfig.base.json` at the root holds shared, non-conflicting strict
  options (`strict`, `esModuleInterop`, `skipLibCheck`,
  `forceConsistentCasingInFileNames`, `target`/`lib` baseline).
- Each app extends it while keeping its framework-specific settings, so the
  app builds are unaffected.

## Linting & formatting (added 2026-06-04)

- Both ESLint and Prettier were replaced by **Biome** across both apps.
- A single root `biome.json` configures the whole monorepo: tab indent,
  double quotes, `recommended` lint rules, import organization, and
  `unsafeParameterDecoratorsEnabled` for NestJS decorators. It respects
  `.gitignore` (so `node_modules`/`dist` are skipped) and excludes
  `package-lock.json`.
- `@biomejs/biome` is installed once at the root; per-app `lint`/`format`
  scripts call the hoisted binary scoped to their `src`/`test` dirs.
- Root scripts: `lint` (`biome lint`), `format` (`biome format --write`),
  `check` (`biome check`).
- All scaffold files were reformatted to Biome's style, and the Vite
  `main.tsx` non-null assertion was replaced with an explicit guard to
  satisfy `lint/style/noNonNullAssertion`.

## Explicitly out of scope

- No `packages/shared` package.
- No shared sample endpoint / no changes to default scaffolds (beyond the
  Biome reformat + the `main.tsx` guard noted above).
- No Vite → API dev proxy.

## Verification

- `npm install` at root completes and hoists dependencies.
- `npm run build` builds both apps successfully.
- Both apps start: API on `:3000`, frontend dev server on `:5173`.
