import type { Request, Response } from "express";
import { RequestIdMiddleware } from "@/common/middleware/request-id.middleware";

describe("RequestIdMiddleware", () => {
	it("attaches a requestId to the request and the response header, then calls next", () => {
		const middleware = new RequestIdMiddleware();
		const req = {} as Request & { requestId?: string };
		const setHeader = jest.fn();
		const res = { setHeader } as unknown as Response;
		const next = jest.fn();

		middleware.use(req, res, next);

		expect(typeof req.requestId).toBe("string");
		expect(req.requestId).toHaveLength(36); // uuid v4
		expect(setHeader).toHaveBeenCalledWith("X-Request-Id", req.requestId);
		expect(next).toHaveBeenCalledTimes(1);
	});
});
