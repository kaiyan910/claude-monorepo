import { Module } from "@nestjs/common";
import { AuthService } from "@/auth/application/auth.service";
import { AuthInfrastructureModule } from "@/auth/infrastructure/auth-infrastructure.module";
import { AuthController } from "@/auth/infrastructure/presenter/http/auth.controller";
import { UserModule } from "@/user/application/user.module";

/**
 * Public entry point for the auth feature. Wires the application service to the
 * user + auth-infrastructure ports and registers the HTTP presenter.
 * AuthInfrastructureModule provides TOKEN_SERVICE, PASSWORD_HASHER, and JwtAuthGuard.
 * UserModule provides USER_REPOSITORY.
 */
@Module({
	imports: [UserModule, AuthInfrastructureModule],
	controllers: [AuthController],
	providers: [AuthService],
})
export class AuthModule {}
