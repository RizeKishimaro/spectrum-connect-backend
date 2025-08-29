import { Prisma } from "@prisma/client";

export function parseOrderBy<T extends Record<string, any>>(
  orderBy?: string
): Prisma.Enumerable<T> | undefined {
  if (!orderBy) return undefined;
  const parts = orderBy.split(',').map(p => p.trim()).filter(Boolean);

  // Each rule looks like: { [field]: 'asc' | 'desc' }
  const rules = parts.map((p) => {
    const [field, dir] = p.split(':');
    return { [field.trim()]: (dir?.toLowerCase() === 'desc' ? 'desc' : 'asc') } as T;
  });

  return rules as Prisma.Enumerable<T>;
}
