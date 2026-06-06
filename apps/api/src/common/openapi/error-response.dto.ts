import { ApiProperty } from "@nestjs/swagger";

/**
 * Schema mirror of the Standard Error Response emitted by
 * CustomExceptionFilter. Lets Swagger give error responses a real schema.
 */
export class ErrorResponseDto {
	@ApiProperty({ example: 401, description: "HTTP status code." })
	httpCode!: number;

	@ApiProperty({
		example: "AUTH_INVALID_CREDENTIALS",
		description: "Stable error code the frontend maps to user-facing text.",
	})
	code!: string;

	@ApiProperty({ example: "Invalid username or password" })
	message!: string;

	@ApiProperty({ example: "87b9a4c3-6eaa-4553-aaee-5809729a13c3" })
	traceId!: string;

	@ApiProperty({ example: "2026-06-05T00:00:00.000Z" })
	createdAt!: string;
}
