import { HttpException, HttpStatus } from "@nestjs/common";
import { DatabaseError } from "@/common/errors/database.error";
import { InvalidCredentialsError } from "@/common/errors/invalid-credentials.error";
import { InvalidTokenError } from "@/common/errors/invalid-token.error";
import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import { UserDisabledError } from "@/common/errors/user-disabled.error";

describe("custom errors", () => {
	it("InvalidCredentialsError is 401 with code AUTH_INVALID_CREDENTIALS", () => {
		const err = new InvalidCredentialsError();
		expect(err).toBeInstanceOf(HttpException);
		expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
		expect(err.code).toBe("AUTH_INVALID_CREDENTIALS");
		expect(err.getResponse()).toBe("Invalid username or password");
	});

	it("UserDisabledError is 403 with code AUTH_USER_DISABLED", () => {
		const err = new UserDisabledError();
		expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
		expect(err.code).toBe("AUTH_USER_DISABLED");
		expect(err.getResponse()).toBe("User account is disabled");
	});

	it("InvalidTokenError is 401 with code AUTH_INVALID_TOKEN", () => {
		const err = new InvalidTokenError();
		expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
		expect(err.code).toBe("AUTH_INVALID_TOKEN");
		expect(err.getResponse()).toBe("Invalid or expired token");
	});

	it("UnauthorizedError is 401 with code AUTH_UNAUTHORIZED", () => {
		const err = new UnauthorizedError();
		expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
		expect(err.code).toBe("AUTH_UNAUTHORIZED");
		expect(err.getResponse()).toBe("Missing or malformed authorization header");
	});

	it("DatabaseError is 500 with code DATABASE_ERROR", () => {
		const err = new DatabaseError("boom");
		expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		expect(err.code).toBe("DATABASE_ERROR");
		expect(err.getResponse()).toBe("boom");
	});
});
