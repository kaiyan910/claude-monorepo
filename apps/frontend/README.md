# @claude-monorepo/frontend

React + TypeScript + Vite app, part of the `claude-monorepo` workspace.

## Scripts

Run from the repo root or this directory:

- `npm run dev -w @claude-monorepo/frontend` — start the Vite dev server on
  http://localhost:5173
- `npm run build -w @claude-monorepo/frontend` — type-check and build to `dist/`
- `npm run preview -w @claude-monorepo/frontend` — preview the production build
- `npm run lint -w @claude-monorepo/frontend` — lint `src/` with Biome
- `npm run format -w @claude-monorepo/frontend` — format `src/` with Biome

## Tooling

Linting and formatting are handled by [Biome](https://biomejs.dev) via the
single `biome.json` at the repo root — there is no ESLint or Prettier config.
