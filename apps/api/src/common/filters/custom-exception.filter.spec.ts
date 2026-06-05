import type { ArgumentsHost } from "@nestjs/common";
import { HttpException, HttpStatus } from "@nestjs/common";
import { InvalidCredentialsError } from "@/common/errors/invalid-credentials.error";
import { CustomExceptionFilter } from "@/common/filters/custom-exception.filter";

function makeHost(requestId?: string) {
	const json = jest.fn();
	const status = jest.fn().mockReturnValue({ json });
	const host = {
		switchToHttp: () => ({
			getResponse: () => ({ status }),
			getRequest: () => ({ requestId }),
		}),
	} as unknown as ArgumentsHost;
	return { host, status, json };
}

describe("CustomExceptionFilter", () => {
	const filter = new CustomExceptionFilter();

	it("formats a custom error with its code and traceId", () => {
		const { host, status, json } = makeHost("trace-123");
		filter.catch(new InvalidCredentialsError(), host);
		expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
		expect(json).toHaveBeenCalledWith(
			expect.objectContaining({
				httpCode: 401,
				code: "AUTH_INVALID_CREDENTIALS",
				message: "Invalid username or password",
				traceId: "trace-123",
			}),
		);
	});

	it("maps a generic HttpException without a code to a status-derived code", () => {
		const { host, json } = makeHost("trace-1");
		filter.catch(new HttpException("Nope", HttpStatus.NOT_FOUND), host);
		expect(json).toHaveBeenCalledWith(
			expect.objectContaining({ httpCode: 404, code: "NOT_FOUND" }),
		);
	});

	it("maps an unknown error to 500 INTERNAL_ERROR", () => {
		const { host, json } = makeHost();
		filter.catch(new Error("boom"), host);
		expect(json).toHaveBeenCalledWith(
			expect.objectContaining({
				httpCode: 500,
				code: "INTERNAL_ERROR",
				traceId: "unknown",
			}),
		);
	});

	it("joins a ValidationPipe array message into a single string", () => {
		const { host, json } = makeHost("trace-2");
		filter.catch(
			new HttpException(
				{ message: ["name must be a string", "age must be a number"] },
				HttpStatus.BAD_REQUEST,
			),
			host,
		);
		expect(json).toHaveBeenCalledWith(
			expect.objectContaining({
				httpCode: 400,
				code: "VALIDATION_ERROR",
				message: "name must be a string, age must be a number",
			}),
		);
	});
});
