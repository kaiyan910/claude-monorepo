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
import {
	ApiBearerAuth,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService } from "@/auth/application/auth.service";
import { AuthResponseDto } from "@/auth/infrastructure/presenter/http/dto/auth-response.dto";
import { LoginDto } from "@/auth/infrastructure/presenter/http/dto/login.dto";
import { MeResponseDto } from "@/auth/infrastructure/presenter/http/dto/me-response.dto";
import { RefreshDto } from "@/auth/infrastructure/presenter/http/dto/refresh.dto";
import {
	type AuthenticatedUser,
	JwtAuthGuard,
} from "@/common/guards/jwt-auth.guard";
import { ApiErrorResponses } from "@/common/openapi/api-error-responses.decorator";

/**
 * HTTP presenter for the auth feature. Delegates all business logic to AuthService.
 * No try/catch — errors propagate to CustomExceptionFilter. Swagger decorators
 * document the success shape and every applicable error `code` per endpoint.
 */
@ApiTags("auth")
@Controller("auth")
export class AuthController {
	constructor(private readonly auth: AuthService) {}

	@Post("login")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: "Authenticate with username and password" })
	@ApiOkResponse({ type: AuthResponseDto, description: "Issued JWT pair." })
	@ApiErrorResponses(
		{
			status: 400,
			code: "VALIDATION_ERROR",
			description: "Request body failed shape validation.",
		},
		{
			status: 401,
			code: "AUTH_INVALID_CREDENTIALS",
			description: "Username/password did not match.",
		},
		{
			status: 403,
			code: "AUTH_USER_DISABLED",
			description: "Account is disabled.",
		},
	)
	login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
		return this.auth.login(dto.username, dto.password);
	}

	@Post("refresh")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: "Exchange a refresh token for a new token pair" })
	@ApiOkResponse({ type: AuthResponseDto, description: "Issued JWT pair." })
	@ApiErrorResponses(
		{
			status: 400,
			code: "VALIDATION_ERROR",
			description: "Request body failed shape validation.",
		},
		{
			status: 401,
			code: "AUTH_INVALID_TOKEN",
			description: "Refresh token is invalid or expired.",
		},
		{
			status: 403,
			code: "AUTH_USER_DISABLED",
			description: "Account is disabled.",
		},
	)
	refresh(@Body() dto: RefreshDto): Promise<AuthResponseDto> {
		return this.auth.refresh(dto.refreshToken);
	}

	@Get("me")
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: "Return the authenticated user's profile" })
	@ApiOkResponse({
		type: MeResponseDto,
		description: "The authenticated user's profile.",
	})
	@ApiErrorResponses(
		{
			status: 401,
			code: "AUTH_UNAUTHORIZED",
			description: "Missing or malformed Authorization header.",
		},
		{
			status: 401,
			code: "AUTH_INVALID_TOKEN",
			description: "Access token is invalid or expired.",
		},
	)
	me(
		@Req() req: Request & { user: AuthenticatedUser },
	): Promise<MeResponseDto> {
		return this.auth.getProfile(req.user.userId);
	}
}
