import type { User as PrismaUser } from "@prisma/client";
import { User } from "@/user/domain/user.vo";

/** Maps the Prisma `User` row to the `User` domain object. */
export const UserMapper = {
	toDomain(row: PrismaUser): User {
		return new User({
			id: row.id,
			name: row.name,
			username: row.username,
			password: row.password,
			email: row.email,
			isRoot: row.isRoot,
			enabled: row.enabled,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	},
};
