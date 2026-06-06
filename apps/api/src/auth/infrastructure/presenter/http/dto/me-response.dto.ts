import { ApiProperty } from "@nestjs/swagger";
import type { UserProfile } from "@/user/domain/user.vo";

/** Response body for GET /auth/me (password-free user profile). */
export class MeResponseDto implements UserProfile {
	@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
	id!: string;

	@ApiProperty({ example: "Root" })
	name!: string;

	@ApiProperty({ example: "root" })
	username!: string;

	@ApiProperty({ example: "root@example.com" })
	email!: string;

	@ApiProperty({
		description: "Whether the user has root privileges.",
		example: true,
	})
	isRoot!: boolean;

	@ApiProperty({ description: "Whether the account is active.", example: true })
	enabled!: boolean;

	@ApiProperty({
		type: String,
		format: "date-time",
		example: "2026-06-05T00:00:00.000Z",
	})
	createdAt!: Date;

	@ApiProperty({
		type: String,
		format: "date-time",
		example: "2026-06-05T00:00:00.000Z",
	})
	updatedAt!: Date;
}
