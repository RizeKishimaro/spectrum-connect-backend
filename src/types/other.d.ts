import { Request } from 'express';
import { Agent, User } from '@prisma/client';

export interface ExpressRequest extends Request {
  user: {
    user: User | Agent
  }
}
