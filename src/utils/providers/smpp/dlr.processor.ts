
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/utils/prisma/prisma.service";
import { Job } from "bullmq";

@Processor("dlrQueue")
@Injectable()
export class DLRConsumer extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ messageId: string; status: string }>) {
    const { messageId, status } = job.data;
    console.log(`📩 DLR Job → ${messageId} = ${status}`);

    // Check if SMS record exists
    const log = await this.prisma.smsLog.findFirst({
      where: { messageId },
      select: { id: true, status: true, systemCompanyId: true },
    });

    if (!log) {
      console.warn(`⚠️ No log found for messageId ${messageId}`);
      return;
    }

    try {
      // Update the SMS log status
      const updated = await this.prisma.smsLog.updateMany({
        where: { messageId },
        data: { status },
      });

      if (updated.count === 0) {
        console.warn(`⚠️ No record for ${messageId}`);
        return;
      }

      console.log(`✅ Updated log ${messageId} → ${status}`);

      // 💎 If delivered, deduct 0.25 credits
      if (status === "DELIVERED") {
        await this.prisma.$transaction(async (tx) => {
          // Find subscription for this company
          const sub = await tx.subscription.findFirst({
            where: {
              user: {
                systemCompanyId: log.systemCompanyId
              }
            },
          });

          if (!sub) {
            console.warn(`⚠️ No subscription found for company ${log.systemCompanyId}`);
            return;
          }

          // Deduct price
          const newBalance = Math.max(sub.smsBalance - 0.05, 0);

          await tx.subscription.update({
            where: { id: sub.id },
            data: { smsBalance: newBalance },
          });

        });
      }
    } catch (e) {
      console.error("❌ DLR update failed:", e);
      throw e; // Let BullMQ retry if needed
    }
  }
}

