import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "@/app.module";
import { CustomExceptionFilter } from "@/common/filters/custom-exception.filter";
import { buildCorsOptions } from "@/config/cors";
import { setupOpenApi } from "@/core/openapi/setup-openapi";

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);
	app.useGlobalFilters(new CustomExceptionFilter());
	app.enableCors(buildCorsOptions(process.env));
	await setupOpenApi(app);
	await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
