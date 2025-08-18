import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginDto } from 'src/auth/dto/login.dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AgentStatus } from '@prisma/client';
import { BasicQuery } from 'src/utils/dto/query.dto';
import { PaginationService } from 'src/utils/providers/pagination/pagination.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private paginationService: PaginationService,
  ) { }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({ where: { email: dto.email }, include: { subscription: true } });

    console.log(user)
    if (!user) throw new BadRequestException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.password);

    console.log(valid)
    if (!valid) throw new BadRequestException('Invalid credentials');

    const token = this.jwt.sign({ sub: user.id, user: user }, { secret: process.env.JWT_SECRET, expiresIn: "7d" });

    return { access_token: token, user: user };
  }

  async getAllUsers(basicQuery: BasicQuery) {
    const users = await this.paginationService.paginate(basicQuery, this.prisma.user, [], {
      systemCompany: true
    })
    // const users = await this.prisma.user.findMany({
    //   include: {
    //     systemCompany: true
    //   }
    // })
    return users
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    return user
  }

  async updateUser(id: string, data: any) {
    const user = await this.prisma.user.update({ where: { id }, data })
    return user
  }

  async removeUser(id: string) {
    const user = await this.prisma.user.delete({
      where: {
        id
      }
    })
    return user;
  }
}
