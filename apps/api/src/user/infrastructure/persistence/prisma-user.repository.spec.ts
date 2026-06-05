import { DatabaseError } from "@/common/errors/database.error";
import type { DatabaseService } from "@/core/database/database.service";
import { PrismaUserRepository } from "@/user/infrastructure/persistence/prisma-user.repository";

const row = {
	id: "user_1",
	name: "Root",
	username: "root",
	password: "hashed-secret",
	email: "root@example.com",
	isRoot: true,
	enabled: true,
	createdAt: new Date("2026-06-05T00:00:00.000Z"),
	updatedAt: new Date("2026-06-05T00:00:00.000Z"),
};

function makeDb(findUnique: jest.Mock) {
	return {
		getClient: () => ({ user: { findUnique } }),
	} as unknown as DatabaseService;
}

describe("PrismaUserRepository", () => {
	it("findByUsername returns a mapped User when found", async () => {
		const findUnique = jest.fn().mockResolvedValue(row);
		const repo = new PrismaUserRepository(makeDb(findUnique));
		const user = await repo.findByUsername("root");
		expect(findUnique).toHaveBeenCalledWith({ where: { username: "root" } });
		expect(user?.username).toBe("root");
	});

	it("findById returns null when not found", async () => {
		const findUnique = jest.fn().mockResolvedValue(null);
		const repo = new PrismaUserRepository(makeDb(findUnique));
		expect(await repo.findById("missing")).toBeNull();
	});

	it("wraps Prisma failures in DatabaseError", async () => {
		const findUnique = jest
			.fn()
			.mockRejectedValue(new Error("connection lost"));
		const repo = new PrismaUserRepository(makeDb(findUnique));
		await expect(repo.findByUsername("root")).rejects.toBeInstanceOf(
			DatabaseError,
		);
	});

	it("findById returns a mapped User when found", async () => {
		const findUnique = jest.fn().mockResolvedValue(row);
		const repo = new PrismaUserRepository(makeDb(findUnique));
		const user = await repo.findById("user_1");
		expect(findUnique).toHaveBeenCalledWith({ where: { id: "user_1" } });
		expect(user?.id).toBe("user_1");
	});

	it("findById wraps Prisma failures in DatabaseError", async () => {
		const findUnique = jest
			.fn()
			.mockRejectedValue(new Error("connection lost"));
		const repo = new PrismaUserRepository(makeDb(findUnique));
		await expect(repo.findById("user_1")).rejects.toBeInstanceOf(DatabaseError);
	});
});
