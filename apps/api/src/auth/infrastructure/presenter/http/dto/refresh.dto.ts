import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/** Refresh request body. */
export class RefreshDto {
	@ApiProperty({
		description: "A valid refresh token previously issued by login or refresh.",
		example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.sig",
	})
	@IsString()
	@IsNotEmpty()
	refreshToken!: string;
}
