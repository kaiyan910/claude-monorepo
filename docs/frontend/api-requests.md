- **Axios** as HTTP client. **TanStack Query** for server state/caching.
- Centralized query keys in `@/lib/query-client.ts` — never hard-code inline.
- Forward TanStack Query's `signal` to Axios for auto-cancellation.
- **Always wrap `useQuery` / `useMutation` in custom hooks** — never call them directly in components. Place hooks in `@/hooks/` (e.g., `use-tender-detail.ts`).

```typescript
// ✅ Correct — custom hook wrapping useQuery
const useTenderDetail = (id: string) =>
  useQuery({
    queryKey: queryKeys.tenders.detail(id),
    queryFn: ({ signal }) => axios.get(`/tenders/${id}`, { signal }).then(r => r.data),
  });

// ❌ Avoid — calling useQuery directly in a component
function TenderPage({ id }: { id: string }) {
  const { data } = useQuery({ queryKey: ['tenders', id], queryFn: ... });
}

export const queryKeys = {
  tenders: {
    all: ['tenders'] as const,
    list: (filters: TenderFilters) => ['tenders', 'list', filters] as const,
    detail: (id: string) => ['tenders', 'detail', id] as const,
  },
} as const;
```