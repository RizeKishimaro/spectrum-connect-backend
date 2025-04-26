
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../utils/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AgentStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) { }

  async register(dto: RegisterDto) {
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        sipUser: dto.sipUser,
        sipPass: dto.sipPass,
        status: AgentStatus.AVAILABLE,
      },
    });
    return { message: 'Registered successfully', userId: user.id };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new Error('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.password);
    await this.prisma.user.update({ where: { id: user.id }, data: { status: AgentStatus.AVAILABLE } });

    if (!valid) throw new Error('Invalid credentials');

    const token = this.jwt.sign({ sub: user.id });

    return { access_token: token };
  }
}

