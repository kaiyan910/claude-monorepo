import {
	type MiddlewareConsumer,
	Module,
	type NestModule,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "@/auth/application/auth.module";
import { RequestIdMiddleware } from "@/common/middleware/request-id.middleware";
import { DatabaseModule } from "@/core/database/database.module";

/** Root module. ConfigModule is global so ConfigService is injectable everywhere. */
@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		DatabaseModule,
		AuthModule,
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		consumer.apply(RequestIdMiddleware).forRoutes("*");
	}
}
