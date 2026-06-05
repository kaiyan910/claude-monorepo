import { Module } from "@nestjs/common";
import { DatabaseService } from "@/core/database/database.service";

/**
 * Provides and exports DatabaseService. Feature infrastructure modules import
 * DatabaseModule explicitly to obtain the Prisma client (no @Global()).
 */
@Module({
	providers: [DatabaseService],
	exports: [DatabaseService],
})
export class DatabaseModule {}
