jest.mock("bcrypt", () => ({ compare: jest.fn() }));

import * as bcrypt from "bcrypt";
import { BcryptPasswordHasher } from "@/auth/infrastructure/bcrypt-password-hasher";

describe("BcryptPasswordHasher", () => {
	it("delegates comparison to bcrypt.compare", async () => {
		(bcrypt.compare as jest.Mock).mockResolvedValue(true);
		const hasher = new BcryptPasswordHasher();
		const result = await hasher.compare("plain", "hash");
		expect(bcrypt.compare).toHaveBeenCalledWith("plain", "hash");
		expect(result).toBe(true);
	});
});
