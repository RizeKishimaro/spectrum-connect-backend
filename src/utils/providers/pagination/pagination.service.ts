import { Injectable } from "@nestjs/common"

type PaginateOptions<TArgs> = {
  page?: number
  limit?: number
  where?: TArgs extends { where?: infer W } ? W : any
  include?: TArgs extends { include?: infer I } ? I : any
  orderBy?: TArgs extends { orderBy?: infer O } ? O : any
}

@Injectable()
export class PaginationService {
  async paginate<
    TModel extends {
      findMany: (args: any) => Promise<any>
      count: (args: any) => Promise<number>
    },
    TArgs = Parameters<TModel["findMany"]>[0],
  >(
    model: TModel,
    options: PaginateOptions<TArgs>,
  ) {
    const {
      page = 1,
      limit = 10,
      where,
      include,
      orderBy = { createdAt: "desc" },
    } = options

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      model.findMany({
        where,
        include,
        orderBy,
        skip,
        take: limit,
      } as TArgs),
      model.count({ where } as TArgs),
    ])

    return {
      data,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    }
  }
}

