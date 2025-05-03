import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CallModule } from './call/call.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { AgentModule } from './agent/agent.module';
import { CallLogModule } from './call-log/call-log.module';
import { SipProviderModule } from './sip-provider/sip-provider.module';
import { SystemCompanyModule } from './system-company/system-company.module';
import { RtpAddressModule } from './rtp-address/rtp-address.module';

@Module({
  imports: [
    CallModule,
    UserModule,
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    AgentModule,
    CallLogModule,
    SipProviderModule,
    SystemCompanyModule,
    RtpAddressModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
