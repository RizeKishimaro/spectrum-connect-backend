
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../utils/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AgentStatus, Role } from '@prisma/client';

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
        roles: dto.roles as Role,
        systemCompany: {
          connect: {
            id: dto.systemCompanyId
          }
        },
        password: hashed,
        sipUser: dto.sipUser,
        sipPass: dto.sipPass,
        status: AgentStatus.AVAILABLE,
      },
    });
    return { message: 'Registered successfully', userId: user.id };
  }

  async login(dto: LoginDto) {
    console.log(dto)
    const user = await this.prisma.agent.findFirst({ where: { sipUname: dto.email } });

    console.log(user)
    if (!user) throw new BadRequestException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.password);

    if (!valid) throw new BadRequestException('Invalid credentials');

    const token = this.jwt.sign({ sub: user.id, user: user }, { secret: process.env.JWT_SECRET, expiresIn: "7d" });

    await this.prisma.agent.update({ where: { id: user.id }, data: { status: AgentStatus.AVAILABLE } });
    return { access_token: token, user: user };
  }
}

