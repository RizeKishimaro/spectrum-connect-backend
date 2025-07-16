import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtService } from '@nestjs/jwt';
import { PjsipService } from 'src/utils/pjsip/pjsip-manager';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtService, PjsipService],
})
export class AuthModule { }
