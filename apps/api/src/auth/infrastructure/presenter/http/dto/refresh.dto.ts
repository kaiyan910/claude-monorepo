import { IsNotEmpty, IsString } from "class-validator";

/** Refresh request body. */
export class RefreshDto {
	@IsString()
	@IsNotEmpty()
	refreshToken!: string;
}
