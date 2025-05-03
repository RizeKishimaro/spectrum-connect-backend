-- DropForeignKey
ALTER TABLE "CallLog" DROP CONSTRAINT "CallLog_agentId_fkey";

-- AlterTable
ALTER TABLE "CallLog" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "SIPProvider" ALTER COLUMN "SipUsername" DROP NOT NULL,
ALTER COLUMN "SipPassword" DROP NOT NULL,
ALTER COLUMN "AccessToken" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
