## Nest & React Monorepo

- setup the project in monorepo style with Nest.js as backend and React.js as frontend

### Tech Stack

| Services | Document                                |
| -------- | --------------------------------------- |
| backend  | [@docs/api.md](./docs/api.md)           |
| frontend | [@docs/frontend.md](./docs/frontend.md) |

### Commands

Root `package.json` scripts (run from the repo root):

| Script | Description |
| --- | --- |
| `prepare` | Lifecycle hook run automatically after `npm install`; points git at the repo's `.githooks` directory so the shared pre-commit hooks are active. |
| `dev` | Runs the API and frontend dev servers together with color-coded, prefixed output (`api`/`web`). |
| `dev:api` | Starts the NestJS backend in watch mode (recompiles on change). |
| `dev:frontend` | Starts the React + Vite frontend dev server with HMR. |
| `build` | Builds every workspace that defines a `build` script. |
| `lint` | Lints the codebase with Biome (reports issues, no changes). |
| `format` | Formats the codebase with Biome and writes changes in place. |
| `check` | Runs Biome's combined linter + formatter check (used in CI / pre-commit). |
| `test` | Runs the `test` script in every workspace that defines one. |

### Comments

- JSDoc above every component describing purpose and usage context.
- Comment complex logic to explain *why*, not *what*.

### Version Control

#### Branches

- Format: `{type}/{short-description}` in kebab-case. Types: `feature`, `fix`, `hotfix`, `refactor`, `chore`, `docs`, `test`.

#### Commits

- Conventional Commits: `{type}(scope): description` — present tense, lowercase, < 72 chars. Atomic commits. No direct pushes to main.

### Specification

- Task decomposition: Decompose every feature into independent, atomic tasks. 
  - Each task must live in its own markdown file, grouped under a feature folder using the structure `./tasks/{feature}/{feature}-{task}.md` (kebab-case, e.g. ./tasks/auth/auth-login-form.md).
  - While using superpowers skills put it under `./docs/superpowers/specs/{feature}/{feature}-{task}.md` and `./docs/superpowers/plans/{feature}/{feature}-{task}.md`
- MVP scope: Each task must represent the smallest shippable increment — implement only what is required to deliver value; defer enhancements to follow-up tasks.
- Task list tracking: Each feature folder must contain a `tasks.md` file that lists every task in the feature with its current status (todo / in-progress / done). Update this file immediately when a task's status changes.