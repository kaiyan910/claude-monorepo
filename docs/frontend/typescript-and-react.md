### TypeScript

- Strict mode enabled — never loosen it.
- No `any` — use `unknown` if uncertain.
- Prefer utility types (`Partial`, `Pick`, `Omit`) over duplicating fields.

### React

- Always pass `AbortController` signal to API requests
- Named `Props` type per component (no inline prop types)
- No `useCallback()` and `useMemo()` when React compiler is activated
- Compound component pattern for logically grouped sub-elements
- One component per file (except compound component sub-elements)
- Code splitting via TanStack Router lazy loading with `<Suspense />`
- Deferred data loading for non-critical UI sections
- JSDoc comment above every component
