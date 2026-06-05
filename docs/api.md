## Principles

- **TDD**: Write tests before implementation.
- **DDD / Clean Architecture**: Separate Domain, Application, Infrastructure layers. Dependencies point inward toward the domain core.
- **Design Patterns First**: Apply patterns for readability and maintainability.

## Tech Stack

- NestJS (Express)
- TypeScript
- Node.js >= v24
- Prisma 7 (`@prisma/adapter-pg`)
- PostgreSQL
- Redis
- Biome.js (no ESLint/Prettier)

## Project Structure

```
src/
├ {feature}/application/                                       # Ports, module, service
├ {feature}/domain/                                            # Factories, value-objects, events
├ {feature}/infrastructure/persistence/                        # Entities, mappers, repositories
├ {feature}/infrastructure/presenter/{http|ws|sse}/            # DTOs, controller
├ {feature}/infrastructure/{feature}-infrastructure.module.ts
├ common/                                                      # Shared filters, middleware, guards
├ core/                                                        # Redis, Socket.IO, database modules
└ main.ts
```

## Commands

- `npm run dev`: run application in development mode
- `npm run build`: build the application
- `npm run db:generate`: generate the `Prisma` client
- `npm run db:migration`: migrate the production database to latest schema using `Prisma`
- `npm run test`: test with `jest`
- `npm run lint`: run `biome.js` for linting
- `npm run format`: format the code using `biome.js`

## Best Practices

- `Database`: [@docs/best-practices/database.md](./docs/best-practices/database.md)
- `Conventions`: [@docs/best-practices/conventions.md](./docs/best-practices/conventions.md)
- `Typescript`: [@docs/best-practices/typescript.md](./docs/best-practices/typescript.md)
- `Validation`: [@docs/best-practices/validation.md](./docs/best-practices/validation.md)
- `Request Tracing`: [@docs/best-practices/request-tracing.md](./docs/best-practices/request-tracing.md)
- `Error Handling`: [@docs/best-practices/error-handling.md](./docs/best-practices/error-handling.md)
- `Testing`: [@docs/best-practices/testing.md](./docs/best-practices/testing.md)
- `Asset Storage`: [@docs/best-practices/asset-storage.md](./docs/best-practices/asset-storage.md)
- `Logging`: [@docs/best-practices/logging.md](./docs/best-practices/logging.md)
- `API Documentation`: [@docs/best-practices/api-documentation.md](./docs/best-practices/api-documentation.md)