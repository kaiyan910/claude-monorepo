import { ApiProperty } from "@nestjs/swagger";
import type { TokenPair } from "@/auth/application/token.service";

/** Response body for login and refresh — the issued JWT pair. */
export class AuthResponseDto implements TokenPair {
	@ApiProperty({
		description: "Short-lived JWT for authenticating API requests.",
		example:
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsInR5cGUiOiJhY2Nlc3MifQ.sig",
	})
	accessToken!: string;

	@ApiProperty({
		description: "Long-lived JWT used to obtain a new token pair.",
		example:
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsInR5cGUiOiJyZWZyZXNoIn0.sig",
	})
	refreshToken!: string;
}
