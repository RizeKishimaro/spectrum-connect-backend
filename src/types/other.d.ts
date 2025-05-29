import { Request } from 'express';
import { Agent } from '@prisma/client';

export interface ExpressRequest extends Request {
  user: Agent
}
