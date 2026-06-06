import { Controller, Get } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { ApiErrorResponses } from "@/common/openapi/api-error-responses.decorator";

@Controller("things")
class ThingsTestController {
	@Get()
	@ApiErrorResponses(
		{ status: 401, code: "AUTH_UNAUTHORIZED" },
		{ status: 401, code: "AUTH_INVALID_TOKEN" },
		{ status: 404, code: "NOT_FOUND" },
	)
	findAll(): string[] {
		return [];
	}
}

describe("ApiErrorResponses", () => {
	it("groups codes that share a status into one response with named examples", async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [ThingsTestController],
		}).compile();
		const app = moduleRef.createNestApplication();

		const document = SwaggerModule.createDocument(
			app,
			new DocumentBuilder().build(),
		);

		const operation = document.paths["/things"].get as {
			responses: Record<
				string,
				{ content?: Record<string, { examples?: Record<string, unknown> }> }
			>;
		};
		const examples =
			operation.responses["401"].content?.["application/json"].examples ?? {};
		expect(Object.keys(examples)).toEqual([
			"AUTH_UNAUTHORIZED",
			"AUTH_INVALID_TOKEN",
		]);
		expect(operation.responses["404"]).toBeDefined();
		expect(document.components?.schemas?.ErrorResponseDto).toBeDefined();

		await app.close();
	});
});
