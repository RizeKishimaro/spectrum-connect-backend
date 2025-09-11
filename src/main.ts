import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CallService } from './call/call.service';
import { createAgiServer } from './utils/agi/agi-server';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AgentService } from './agent/agent.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as myIVRTree from './ivr-config.json';
import { ParkedCallService } from './parked-call/parked-call.service';
import { PrismaService } from './utils/prisma/prisma.service';
import { promises as fs } from "fs";
import { Logger } from "@nestjs/common";

async function checkFileAccess(path: string) {
  try {
    // Check read/write access
    await fs.access(path, fs.constants.R_OK | fs.constants.W_OK);
    // Try writing a tiny test (append+remove immediately)
    await fs.appendFile(path, "\n; test access\n");
    Logger.log(`✅ File access check passed for: ${path}`, "PermissionCheck");
    return true;
  } catch (err: any) {
    Logger.error(
      `❌ Cannot access ${path} (${err.code}) - shutting down`,
      "PermissionCheck"
    );
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  app.enableCors({
    origin: allowedOrigins,
    // origin: '*',
    credentials: true,
  });
  const ok = await checkFileAccess("/etc/asterisk/pjsip-agent.conf");
  if (!ok) {
    await app.close();
    process.exit(1);
  }

  app.useStaticAssets(join(process.cwd(), 'public'));
  const callService = app.get(CallService);
  const agentService = app.get(AgentService);
  const parkedCallService = app.get(ParkedCallService);
  const prismaService = app.get(PrismaService);
  createAgiServer(
    callService,
    agentService,
    myIVRTree,
    parkedCallService,
    prismaService,
  );

  const config = new DocumentBuilder()
    .setTitle('Spectrem Connect API 🪐')
    .setDescription('Kawaii API doc for Subscription SIP System nya~ 💕')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // visit: http://localhost:3000/api-docs
  await app.listen(process.env.PORT ?? 8000, '0.0.0.0');
}
bootstrap();
