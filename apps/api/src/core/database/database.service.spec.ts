const connectMock = jest.fn();
const disconnectMock = jest.fn();

jest.mock("@prisma/adapter-pg", () => ({
	PrismaPg: jest.fn().mockImplementation(() => ({ adapter: true })),
}));

jest.mock("@prisma/client", () => ({
	PrismaClient: jest.fn().mockImplementation(() => ({
		$connect: connectMock,
		$disconnect: disconnectMock,
	})),
}));

import { DatabaseService } from "@/core/database/database.service";

describe("DatabaseService", () => {
	beforeEach(() => {
		process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
		connectMock.mockClear();
		disconnectMock.mockClear();
	});

	it("exposes a Prisma client via getClient()", () => {
		const service = new DatabaseService();
		const client = service.getClient();
		expect(client).toBeDefined();
		expect(client.$connect).toBeDefined();
		expect(client.$disconnect).toBeDefined();
	});

	it("connects on module init and disconnects on destroy", async () => {
		const service = new DatabaseService();
		await service.onModuleInit();
		await service.onModuleDestroy();
		expect(connectMock).toHaveBeenCalledTimes(1);
		expect(disconnectMock).toHaveBeenCalledTimes(1);
	});
});
