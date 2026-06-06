import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/** Login request body. Shape-only validation per validation.md. */
export class LoginDto {
	@ApiProperty({ example: "root", description: "Account username." })
	@IsString()
	@IsNotEmpty()
	username!: string;

	@ApiProperty({
		example: "correct-horse-battery-staple",
		description: "Account password.",
	})
	@IsString()
	@IsNotEmpty()
	password!: string;
}
