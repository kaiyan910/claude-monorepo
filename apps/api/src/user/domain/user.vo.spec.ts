import { User, type UserProps } from "@/user/domain/user.vo";

const props: UserProps = {
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

describe("User", () => {
	it("exposes identity and auth-relevant getters", () => {
		const user = new User(props);
		expect(user.id).toBe("user_1");
		expect(user.username).toBe("root");
		expect(user.passwordHash).toBe("hashed-secret");
		expect(user.isRoot).toBe(true);
		expect(user.enabled).toBe(true);
	});

	it("toProfile() omits the password", () => {
		const profile = new User(props).toProfile();
		expect(profile).not.toHaveProperty("password");
		expect(profile).toEqual({
			id: "user_1",
			name: "Root",
			username: "root",
			email: "root@example.com",
			isRoot: true,
			enabled: true,
			createdAt: props.createdAt,
			updatedAt: props.updatedAt,
		});
	});

	it("does not expose the password when serialized to JSON", () => {
		const json = JSON.stringify(new User(props));
		expect(json).not.toContain("hashed-secret");
		expect(json).not.toContain("password");
	});
});
