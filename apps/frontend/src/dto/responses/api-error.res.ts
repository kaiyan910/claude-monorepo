import { z } from "zod";

/** Standard API error envelope produced by CustomExceptionFilter. */
export const apiErrorSchema = z.object({
	httpCode: z.number(),
	code: z.string(),
	message: z.string(),
	traceId: z.string(),
	createdAt: z.string(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
