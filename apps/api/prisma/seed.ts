import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

/** Reads a required env var, throwing if absent (mirrors src/config/env.ts). */
function requireEnv(key: string): string {
	const value = process.env[key];
	if (value === undefined || value === "") {
		throw new Error(`Missing required env var: ${key}`);
	}
	return value;
}

async function main(): Promise<void> {
	const adapter = new PrismaPg({
		connectionString: requireEnv("DATABASE_URL"),
	});
	const prisma = new PrismaClient({ adapter });

	const username = requireEnv("SEED_ROOT_USERNAME");
	const passwordHash = await bcrypt.hash(requireEnv("SEED_ROOT_PASSWORD"), 12);

	await prisma.user.upsert({
		where: { username },
		update: {},
		create: {
			name: requireEnv("SEED_ROOT_NAME"),
			username,
			password: passwordHash,
			email: requireEnv("SEED_ROOT_EMAIL"),
			isRoot: true,
			enabled: true,
		},
	});

	console.log(`Seeded root user: ${username}`);
	await prisma.$disconnect();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
