import { IsNotEmpty, IsString } from "class-validator";

/** Login request body. Shape-only validation per validation.md. */
export class LoginDto {
	@IsString()
	@IsNotEmpty()
	username!: string;

	@IsString()
	@IsNotEmpty()
	password!: string;
}
