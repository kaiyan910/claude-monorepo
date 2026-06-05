import type { TokenPair } from "@/auth/application/token.service";

/** Response body for login and refresh — the issued JWT pair. */
export type AuthResponseDto = TokenPair;
