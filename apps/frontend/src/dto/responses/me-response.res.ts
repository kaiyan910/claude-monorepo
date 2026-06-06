import { z } from "zod";

/** `GET /auth/me` success body. Dates arrive as ISO-8601 strings over JSON. */
export const meResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	username: z.string(),
	email: z.string(),
	isRoot: z.boolean(),
	enabled: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;
