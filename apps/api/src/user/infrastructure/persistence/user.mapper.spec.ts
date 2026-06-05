import { UserMapper } from "@/user/infrastructure/persistence/user.mapper";

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

describe("UserMapper", () => {
	it("maps a Prisma row to a User domain object", () => {
		const user = UserMapper.toDomain(row);
		expect(user.id).toBe("user_1");
		expect(user.username).toBe("root");
		expect(user.passwordHash).toBe("hashed-secret");
		expect(user.isRoot).toBe(true);
		expect(user.enabled).toBe(true);
		const profile = user.toProfile();
		expect(profile.name).toBe("Root");
		expect(profile.email).toBe("root@example.com");
		expect(profile.createdAt).toEqual(new Date("2026-06-05T00:00:00.000Z"));
		expect(profile.updatedAt).toEqual(new Date("2026-06-05T00:00:00.000Z"));
	});
});
