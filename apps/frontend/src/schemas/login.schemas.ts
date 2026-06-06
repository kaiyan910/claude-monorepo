import { z } from "zod";

/**
 * Login form schema. Mirrors the backend's shape-only validation (non-empty
 * username/password). Messages are i18n keys in the `auth` namespace, resolved
 * with `t()` at render time.
 */
export const loginSchema = z.object({
	username: z.string().min(1, "errors.usernameRequired"),
	password: z.string().min(1, "errors.passwordRequired"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
