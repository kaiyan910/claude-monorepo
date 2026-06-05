import { Injectable } from "@nestjs/common";
import { DatabaseError } from "@/common/errors/database.error";
import { DatabaseService } from "@/core/database/database.service";
import type { UserRepository } from "@/user/application/user.repository";
import type { User } from "@/user/domain/user.vo";
import { UserMapper } from "@/user/infrastructure/persistence/user.mapper";

/**
 * Prisma-backed UserRepository. Wraps every Prisma call so infrastructure errors
 * (e.g. PrismaClientKnownRequestError) never leak past this boundary.
 */
@Injectable()
export class PrismaUserRepository implements UserRepository {
	constructor(private readonly db: DatabaseService) {}

	async findByUsername(username: string): Promise<User | null> {
		try {
			const row = await this.db
				.getClient()
				.user.findUnique({ where: { username } });
			return row ? UserMapper.toDomain(row) : null;
		} catch (error) {
			throw new DatabaseError("Failed to query user by username", error);
		}
	}

	async findById(id: string): Promise<User | null> {
		try {
			const row = await this.db.getClient().user.findUnique({ where: { id } });
			return row ? UserMapper.toDomain(row) : null;
		} catch (error) {
			throw new DatabaseError("Failed to query user by id", error);
		}
	}
}
