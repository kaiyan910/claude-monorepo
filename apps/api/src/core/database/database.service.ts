import {
	Injectable,
	type OnModuleDestroy,
	type OnModuleInit,
} from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { requireEnv } from "@/config/env";

/**
 * Owns the single PrismaClient instance for the app. Uses the @prisma/adapter-pg
 * driver adapter (NOT the legacy binary engine). Consumers access the client via
 * getClient() — composition, never inheritance.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
	private readonly client: PrismaClient;

	constructor() {
		// Prisma 7: PrismaPg takes a config object with `connectionString`.
		const adapter = new PrismaPg({
			connectionString: requireEnv(process.env, "DATABASE_URL"),
		});
		this.client = new PrismaClient({ adapter });
	}

	getClient(): PrismaClient {
		return this.client;
	}

	async onModuleInit(): Promise<void> {
		await this.client.$connect();
	}

	async onModuleDestroy(): Promise<void> {
		await this.client.$disconnect();
	}
}
