import { Request } from 'express';


export function getSystemCompanyId(req: Request): number {
  // Adjust to your auth payload shape
  const id = (req as any)?.user?.systemCompanyId ?? (req as any)?.user?.companyId ?? (req as any)?.systemCompanyId;
  if (!id && id !== 0) {
    throw new Error('systemCompanyId missing in request context');
  }
  return Number(id);
}
