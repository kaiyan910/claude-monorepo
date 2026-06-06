import { describe, expect, it } from "vitest";
import { errorKeyFromCode } from "@/i18n/error-message";

describe("errorKeyFromCode", () => {
	it("maps known API codes to namespaced i18n keys", () => {
		expect(errorKeyFromCode("AUTH_INVALID_CREDENTIALS")).toBe(
			"errors.invalidCredentials",
		);
		expect(errorKeyFromCode("AUTH_USER_DISABLED")).toBe("errors.userDisabled");
		expect(errorKeyFromCode("VALIDATION_ERROR")).toBe("errors.validation");
		expect(errorKeyFromCode("NETWORK_ERROR")).toBe("errors.network");
	});

	it("falls back to the unknown key for unmapped codes", () => {
		expect(errorKeyFromCode("SOMETHING_ELSE")).toBe("errors.unknown");
		expect(errorKeyFromCode(undefined)).toBe("errors.unknown");
	});
});
