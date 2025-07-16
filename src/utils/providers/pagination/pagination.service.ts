

import { Injectable } from '@nestjs/common';
import { BasicQuery } from 'src/utils/dto/query.dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Injectable()
export class PaginationService {
  constructor(private readonly prisma: PrismaService) { }

  buildWhereCondition(
    filterModel?: string,
    filterKeyword?: string,
    searchKeyword?: string,
    searchColumns: string[] = [],
  ) {
    let where: any = {};

    if (filterModel && filterKeyword) {
      if (filterModel === 'role' || filterModel === 'status') {
        where[filterModel] = { equals: filterKeyword };
      } else {
        where[filterModel] = { contains: filterKeyword };
      }
    }

    if (searchKeyword && searchColumns.length > 0) {
      where.OR = searchColumns.map((column) => ({
        [column]: { contains: searchKeyword },
      }));
    }

    return where;
  }

  buildOrderByCondition(sortField?: string, sortType?: string) {
    return sortField && sortType ? { [sortField]: sortType } : {};
  }

  async paginate<T>(
    basicQuery: BasicQuery,
    model: any,
    searchColumns: string[] = [],
    include: any = {},
    extraWhere: any = {}, // <- Add extra where condition support
  ): Promise<{
    data: T[];
    meta: { count: number; page: number; pageCount: number; limit: number };
  }> {
    const {
      page = 1,
      limit = 10,
      sortField,
      sortType,
      filterModel,
      filterKeyword,
      searchKeyword,
    } = basicQuery;

    const where = {
      ...this.buildWhereCondition(filterModel, filterKeyword, searchKeyword, searchColumns),
      ...extraWhere,
    };

    const orderBy = this.buildOrderByCondition(sortField, sortType);
    const offset = (Number(page) - 1) * Number(limit);

    const [data, count]: [T[], number] = await Promise.all([

      model.findMany({
        skip: offset,
        take: +limit,
        where,
        ...(orderBy && Object.keys(orderBy).length ? { orderBy } : {}),
        ...(include && Object.keys(include).length ? { include } : {}),
      }),
      model.count({ where }),
    ]);

    return {
      data,
      meta: {
        count,
        page: +page,
        pageCount: Math.ceil(count / Number(limit)),
        limit: +limit,
      },
    };
  }
}

