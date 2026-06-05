- Uses `Prisma 7` ORM
- Uses `@prisma/adapter-pg` driver adapter — **not** the legacy binary engine.
- `PrismaClient` **must** be constructed with a `PrismaPg` adapter. Bare `new PrismaClient()` will throw.
- `DatabaseService` uses composition (not inheritance). Access client via `databaseService.getClient()`.
- Schema in `prisma/schema.prisma`. Run `npx prisma generate` after changes, `npx prisma migrate dev` for migrations.
- Mock both `@prisma/client` and `@prisma/adapter-pg` in unit tests.

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg(process.env.DATABASE_URL ?? "");
const client = new PrismaClient({ adapter });
```