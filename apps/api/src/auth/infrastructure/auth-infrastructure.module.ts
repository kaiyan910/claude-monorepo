import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PASSWORD_HASHER } from "@/auth/application/password-hasher";
import { TOKEN_SERVICE } from "@/auth/application/token.service";
import { BcryptPasswordHasher } from "@/auth/infrastructure/bcrypt-password-hasher";
import { JwtTokenService } from "@/auth/infrastructure/jwt-token.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";

/**
 * Binds the auth ports to their implementations and provides the guard.
 * JwtModule.register({}) supplies a JwtService; secrets/TTLs are passed per-call
 * by JwtTokenService from ConfigService (ConfigModule is global).
 * Does NOT import AuthService or AuthController — no circular deps.
 */
@Module({
	imports: [JwtModule.register({})],
	providers: [
		{ provide: TOKEN_SERVICE, useClass: JwtTokenService },
		{ provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
		JwtAuthGuard,
	],
	exports: [TOKEN_SERVICE, PASSWORD_HASHER, JwtAuthGuard],
})
export class AuthInfrastructureModule {}
