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

- `Database`: [@api/database.md](./api/database.md)
- `Conventions`: [@api/conventions.md](./api/conventions.md)
- `Typescript`: [@api/typescript.md](./api/typescript.md)
- `Validation`: [@api/validation.md](./api/validation.md)
- `Request Tracing`: [@api/request-tracing.md](./api/request-tracing.md)
- `Error Handling`: [@api/error-handling.md](./api/error-handling.md)
- `Testing`: [@api/testing.md](./api/testing.md)
- `Asset Storage`: [@api/asset-storage.md](./api/asset-storage.md)
- `Logging`: [@api/logging.md](./api/logging.md)
- `API Documentation`: [@api/api-documentation.md](./api/api-documentation.md)