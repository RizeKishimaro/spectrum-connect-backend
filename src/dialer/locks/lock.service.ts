import { Injectable, Logger } from '@nestjs/common';


/** Simple in-memory lock with TTL; replace with Redis for multi-instance. */
@Injectable()
export class LockService {
  private readonly log = new Logger(LockService.name);
  private locks = new Map<string, number>(); // key -> expiresAt ms


  async acquire(key: string, ttlMs = 10000): Promise<boolean> {
    const now = Date.now();
    const exp = this.locks.get(key);
    if (exp && exp > now) return false;
    this.locks.set(key, now + ttlMs);
    return true;
  }
  async release(key: string) {
    this.locks.delete(key);
  }
}
