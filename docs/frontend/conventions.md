### File Naming

All files use **kebab-case**. Every file has a role suffix: `.api.ts`, `.schemas.ts`, `.store.ts`, `.vo.ts`, `.mapper.ts`. Hooks use `use-` prefix.

### Type Naming

- DTOs: `SignInRequest` / `SignInResponse` → `sign-in-request.dto.ts`
- VOs: `User`, `Tender` (no `Vo` suffix) → `user.vo.ts`

### Imports

- Always use `@/` alias (mapped to `src/`). No relative `../` chains.
- Setup the alias in `tsconfig.app.json`

```json
{
	"compilerOptions": {
		/* Path alias */
		"paths": {
			"@/*": ["./src/*"]
		}
	},
}
```