import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginDto } from 'src/auth/dto/login.dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AgentStatus } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) { }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({ where: { email: dto.email } });

    if (!user) throw new BadRequestException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.password);

    if (!valid) throw new BadRequestException('Invalid credentials');

    const token = this.jwt.sign({ sub: user.id, user: user }, { secret: process.env.JWT_SECRET, expiresIn: "7d" });

    return { access_token: token, user: user };
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({})
    return users
  }
}
