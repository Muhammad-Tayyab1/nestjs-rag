import 'dotenv/config'
import {NestFactory} from '@nestjs/core'
import {ValidationPipe} from '@nestjs/common'
import {SwaggerModule, DocumentBuilder} from '@nestjs/swagger'
import {AppModule} from './app.module'
import {HttpExceptionFilter} from './common/filters/http-exception.filter'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	app.enableCors({origin: '*'})
	app.useGlobalPipes(new ValidationPipe({whitelist: true, transform: true}))
	app.useGlobalFilters(new HttpExceptionFilter())

	const config = new DocumentBuilder()
		.setTitle('RAG Studio API')
		.setDescription('Document ingestion and AI-powered Q&A endpoints')
		.setVersion('1.0')
		.build()
	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup('api/docs', app, document)

	const port = process.env.PORT || 3001
	await app.listen(port, '0.0.0.0')
	console.log(`Backend running on port ${port}`)
	console.log(`Swagger docs at http://localhost:${port}/api/docs`)
}
bootstrap()
