- No `useContext` for state. Max one level of prop drilling.
- URL query params for all search/filter/sort state via **nuqs** with `debounce()` on text inputs.

### Tools for State
- Global or shared: `Zustand`
- URL-driven: `nuqs`
- Form: `TanStack Form`
- Server or async: `TanStack Query`
- Local UI: `useState`