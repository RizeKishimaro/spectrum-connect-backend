
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) { }

  create(dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({ data: dto });
  }




  async findAll() {
    const subscriptions = await this.prisma.subscription.findMany({
      include: {
        user: {
          include: {
            systemCompany: {
              include: {
                _count: {
                  select: {
                    Agent: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 🪄 Transform each item to include maxAgents at top level!
    return subscriptions.map((sub) => ({
      ...sub,
      totalAgents: sub.user.systemCompany?._count.Agent ?? 0,
    }));
  }

  findOne(id: string) {
    return this.prisma.subscription.findUnique({ where: { id } });
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    const existing = await this.prisma.subscription.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Subscription not found');
    return this.prisma.subscription.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: string) {
    const existing = await this.prisma.subscription.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Subscription not found');
    return this.prisma.subscription.delete({ where: { id } });
  }
}

