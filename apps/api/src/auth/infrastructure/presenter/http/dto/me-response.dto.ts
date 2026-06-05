import type { UserProfile } from "@/user/domain/user.vo";

/** Response body for GET /auth/me (password-free user profile). */
export type MeResponseDto = UserProfile;
