
import { forwardRef, Module } from '@nestjs/common';
import { SystemManagerService } from './system-manager.service';
import { SystemManagerController } from './system-manager.controller';
import { ParkedCallModule } from 'src/parked-call/parked-call.module'; // 💡 Import the module, not just the service!
import { AgentModule } from 'src/agent/agent.module';
import { ParkedCallService } from 'src/parked-call/parked-call.service';

@Module({
  imports: [ParkedCallModule, forwardRef(() => AgentModule)], // 💖 Add this!
  controllers: [SystemManagerController],
  providers: [SystemManagerService, ParkedCallService],
  exports: [SystemManagerService],
})
export class SystemManagerModule { }

