import { requireEnv } from "@/config/env";

describe("requireEnv", () => {
	it("returns the value when the variable is set", () => {
		const env = { FOO: "bar" } as NodeJS.ProcessEnv;
		expect(requireEnv(env, "FOO")).toBe("bar");
	});

	it("throws when the variable is missing", () => {
		const env = {} as NodeJS.ProcessEnv;
		expect(() => requireEnv(env, "FOO")).toThrow(
			"Missing required env var: FOO",
		);
	});

	it("throws when the variable is set to an empty string", () => {
		const env = { FOO: "" } as NodeJS.ProcessEnv;
		expect(() => requireEnv(env, "FOO")).toThrow(
			"Missing required env var: FOO",
		);
	});
});
