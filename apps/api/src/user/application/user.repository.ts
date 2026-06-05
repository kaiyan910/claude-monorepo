import type { User } from "@/user/domain/user.vo";

/** DI token for the UserRepository port. */
export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

/**
 * Persistence-agnostic access to users. The auth feature depends on this port,
 * never on Prisma directly.
 */
export interface UserRepository {
	findByUsername(username: string): Promise<User | null>;
	findById(id: string): Promise<User | null>;
}
