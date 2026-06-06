import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import type { Request, Response } from "express";

/**
 * Wires the OpenAPI document and its Scalar reference UI onto the app.
 *
 * Non-production only: when NODE_ENV is "production" this returns immediately,
 * so neither the raw spec nor the reference UI is ever exposed in prod. The two
 * routes it adds (`GET /openapi.json`, `GET /reference`) are registered on the
 * raw HTTP adapter / via `app.use`, outside the Nest controller pipeline — the
 * global ValidationPipe and CustomExceptionFilter never touch them.
 */
export async function setupOpenApi(app: INestApplication): Promise<void> {
	if (process.env.NODE_ENV === "production") {
		return;
	}

	const config = new DocumentBuilder()
		.setTitle("Claude Monorepo API")
		.setDescription("HTTP API for the claude-monorepo backend service.")
		.setVersion("0.0.1")
		.addBearerAuth()
		.addTag("auth", "Authentication endpoints")
		.build();

	const document = SwaggerModule.createDocument(app, config);

	const httpAdapter = app.getHttpAdapter();
	httpAdapter.get("/openapi.json", (_req: Request, res: Response) => {
		res.json(document);
	});

	app.use("/reference", apiReference({ url: "/openapi.json" }));
}
