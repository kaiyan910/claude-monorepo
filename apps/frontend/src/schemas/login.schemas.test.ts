import { describe, expect, it } from "vitest";
import { loginSchema } from "@/schemas/login.schemas";

describe("loginSchema", () => {
	it("accepts a non-empty username and password", () => {
		const result = loginSchema.safeParse({
			username: "root",
			password: "pw",
		});
		expect(result.success).toBe(true);
	});

	it("rejects an empty username with the i18n key", () => {
		const result = loginSchema.safeParse({ username: "", password: "pw" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe("errors.usernameRequired");
		}
	});

	it("rejects an empty password with the i18n key", () => {
		const result = loginSchema.safeParse({ username: "root", password: "" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe("errors.passwordRequired");
		}
	});
});
