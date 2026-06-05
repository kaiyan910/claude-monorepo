## Principles

- **TDD**: Write tests before implementation
- **Design Patterns First**: Apply patterns for readability and maintainability
- **Screen Mockup**: Build mockup screen for approval before code implmentation

## Tech Stack

- Vite
- TypeScript
- Node.js >= v22
- React 19 (React Compiler enabled)
- Biome.js (no ESLint/Prettier)

## Project Structure

```
src/
├ assets/              # Static images
├ api/                 # API functions (*.api.ts)
├ dto/requests/        # Request DTOs (*.req.ts)
├ dto/responses/       # Response DTOs (*.res.ts)
├ dto/mapper/          # DTO ↔ domain mappers (*.mapper.ts)
├ vo/                  # View objects for UI display (*.vo.ts)
├ hooks/               # Custom hooks (use-*.ts)
├ i18n/                # Translation files
├ components/features/ # Feature-specific components
├ components/common/   # Shared components
├ components/ui/       # shadcn/ui components
├ routes/              # Router pages
├ store/               # Zustand stores (*.store.ts)
├ schemas/             # Zod validation (*.schemas.ts)
├ lib/                 # Utilities and helpers
└ types/               # TypeScript types/interfaces
```

## Commands

- `npm run dev`: run application in development mode
- `npm run build`: build the application
- `npm run test`: test with `vitetest`
- `npm run lint`: run `biome.js` for linting
- `npm run format`: format the code using `biome.js`

## Best Practices

- `Conventions`: [@frontend/conventions.md](./frontend/conventions.md)
- `Typescript and React`: [@frontend/typescript-and-react.md](./frontend/typescript-and-react.md)
- `Style`: [@frontend/style.md](./docs//best-practices/style.md)
- `State Management`: [@frontend/state-management.md](./frontend/state-management.md)
- `Form`: [@frontend/form.md](./frontend/form.md)
- `Data Validation`: [@frontend/data-validation.md](./frontend/data-validation.md)
- `API Requests`: [@frontend/api-requests.md](./frontend/api-requests.md)
- `Localization and Error Messages`: [@frontend/localization.md](./frontend/localization.md)
- `Testing`: [@frontend/testing.md](./frontend/testing.md)

## Libraries to Use

| Domain        | Library        |
|---------------|----------------|
| Data tables   | TanStack Table |
| Drag and drop | dnd-kit        |
| Charts        | Recharts       |
| Date/time     | Day.js         |