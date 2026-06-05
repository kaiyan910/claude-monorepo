import { Module } from "@nestjs/common";
import { UserInfrastructureModule } from "@/user/infrastructure/user-infrastructure.module";

/**
 * Public entry point for the user feature. Re-exports the infrastructure module
 * so consumers (e.g. AuthModule) get the USER_REPOSITORY port.
 */
@Module({
	imports: [UserInfrastructureModule],
	exports: [UserInfrastructureModule],
})
export class UserModule {}
