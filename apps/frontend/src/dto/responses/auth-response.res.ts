import { z } from "zod";

/** `POST /auth/login` + `/auth/refresh` success body — the issued JWT pair. */
export const authResponseSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
