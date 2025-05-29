
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) { }

  create(dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({ data: dto });
  }

  findAll() {
    return this.prisma.subscription.findMany();
  }

  findOne(id: string) {
    return this.prisma.subscription.findUnique({ where: { id } });
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    const existing = await this.prisma.subscription.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Subscription not found');
    return this.prisma.subscription.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.subscription.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Subscription not found');
    return this.prisma.subscription.delete({ where: { id } });
  }
}

