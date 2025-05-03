import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CallService } from './call/call.service';
import { createAgiServer } from './utils/agi/agi-server';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AgentService } from './agent/agent.service';
import { readdir } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors("*")
  const callService = app.get(CallService);
  const agentService = app.get(AgentService);
  createAgiServer(callService, agentService);

  const config = new DocumentBuilder()
    .setTitle('Spectrem Connect API 🪐')
    .setDescription('Kawaii API doc for Subscription SIP System nya~ 💕')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // visit: http://localhost:3000/api-docs
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
