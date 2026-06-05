import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/core/database/database.module";
import { USER_REPOSITORY } from "@/user/application/user.repository";
import { PrismaUserRepository } from "@/user/infrastructure/persistence/prisma-user.repository";

/** Binds the UserRepository port to its Prisma implementation. */
@Module({
	imports: [DatabaseModule],
	providers: [{ provide: USER_REPOSITORY, useClass: PrismaUserRepository }],
	exports: [USER_REPOSITORY],
})
export class UserInfrastructureModule {}
