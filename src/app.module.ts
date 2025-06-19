import { forwardRef, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CallModule } from './call/call.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { CallLogModule } from './call-log/call-log.module';
import { SipProviderModule } from './sip-provider/sip-provider.module';
import { SystemCompanyModule } from './system-company/system-company.module';
import { RtpAddressModule } from './rtp-address/rtp-address.module';
import { SystemManagerModule } from './system-manager/system-manager.module';
import { ParkedCallModule } from './parked-call/parked-call.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AmiModule } from './utils/providers/ami/ami-provider.module';
import { PrismaModule } from './utils/prisma/prisma.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './utils/guards/jwt.guard';
import { PaginationModule } from './utils/providers/pagination/pagination.module';
import { SmsModule } from './sms/sms.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    AmiModule,
    ScheduleModule.forRoot(),
    CallModule,
    UserModule,
    AuthModule,
    PrismaModule,
    PaginationModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    CallLogModule,
    SipProviderModule,
    SystemCompanyModule,
    RtpAddressModule,
    SystemManagerModule,
    ParkedCallModule,
    SubscriptionsModule,
    SmsModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    }
  ],
})
export class AppModule { }
