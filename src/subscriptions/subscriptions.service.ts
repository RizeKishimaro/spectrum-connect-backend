
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { PaginationService } from 'src/utils/providers/pagination/pagination.service';
import { BasicQuery } from 'src/utils/dto/query.dto';
import type { Subscription } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private paginationService: PaginationService
  ) { }

  create(dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({ data: dto });
  }




  async findAll(basicQuery: BasicQuery) {
    const subscriptions = await this.paginationService.paginate(basicQuery, this.prisma.subscription, [], {
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
    });
    //  await this.prisma.subscription.findMany({
    //   include: {
    //     user: {
    //       include: {
    //         systemCompany: {
    //           include: {
    //             _count: {
    //               select: {
    //                 Agent: true,
    //               },
    //             },
    //           },
    //         },
    //       },
    //     },
    //   },
    // });

    // 🪄 Transform each item to include maxAgents at top level!
    const transformed = subscriptions.data.map((sub: any) => ({
      ...sub,
      totalAgents: sub.user.systemCompany?._count.Agent ?? 0,
    }));
    return {
      data: transformed,
      meta: subscriptions.meta
    }
  }

  findOne(id: string) {
    return this.prisma.subscription.findUnique({ where: { id } });
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    const existing = await this.prisma.subscription.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Subscription not found');
    console.log(dto)
    return this.prisma.subscription.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: string) {
    const existing = await this.prisma.subscription.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Subscription not found');
    return this.prisma.subscription.delete({ where: { id } });
  }
}

