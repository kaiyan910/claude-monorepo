import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Req,
	UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "@/auth/application/auth.service";
import type { AuthResponseDto } from "@/auth/infrastructure/presenter/http/dto/auth-response.dto";
import { LoginDto } from "@/auth/infrastructure/presenter/http/dto/login.dto";
import type { MeResponseDto } from "@/auth/infrastructure/presenter/http/dto/me-response.dto";
import { RefreshDto } from "@/auth/infrastructure/presenter/http/dto/refresh.dto";
import {
	type AuthenticatedUser,
	JwtAuthGuard,
} from "@/common/guards/jwt-auth.guard";

/**
 * HTTP presenter for the auth feature. Delegates all business logic to AuthService.
 * No try/catch — errors propagate to CustomExceptionFilter.
 */
@Controller("auth")
export class AuthController {
	constructor(private readonly auth: AuthService) {}

	@Post("login")
	@HttpCode(HttpStatus.OK)
	login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
		return this.auth.login(dto.username, dto.password);
	}

	@Post("refresh")
	@HttpCode(HttpStatus.OK)
	refresh(@Body() dto: RefreshDto): Promise<AuthResponseDto> {
		return this.auth.refresh(dto.refreshToken);
	}

	@Get("me")
	@UseGuards(JwtAuthGuard)
	me(
		@Req() req: Request & { user: AuthenticatedUser },
	): Promise<MeResponseDto> {
		return this.auth.getProfile(req.user.userId);
	}
}
