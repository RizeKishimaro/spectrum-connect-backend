import { forwardRef, Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { join } from 'path';
import { SystemManagerService } from 'src/system-manager/system-manager.service';
import { ParkedCallService } from 'src/parked-call/parked-call.service';
import { SystemManagerModule } from 'src/system-manager/system-manager.module';

@Module({
  imports: [
    MulterModule.register({
      dest: join(process.cwd(), "public", "profiles"),
    }),
    forwardRef(() => SystemManagerModule)
  ],
  controllers: [AgentController],
  providers: [AgentService, JwtService, SystemManagerService, ParkedCallService],
  exports: [AgentService],
})
export class AgentModule { }
