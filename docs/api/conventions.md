### File Naming

All files use **kebab-case** with role suffixes: `.module.ts`, `.controller.ts`, `.service.ts`, `.dto.ts`, `.vo.ts`, `.mapper.ts`.

### Type Naming

- DTOs: `SignInRequest` / `SignInResponse` → `sign-in-request.dto.ts`
- VOs: `User`, `Application` (no `Vo` suffix) → `user.vo.ts`

### Imports

- Always use `@/` alias (mapped to `src/`). No relative `../` chains.
- Setup the alias in `tsconfig.json`

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