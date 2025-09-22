/*
  Warnings:

  - Added the required column `agentId` to the `AgentInformation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AgentInformation" ADD COLUMN     "agentId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "AgentInformation" ADD CONSTRAINT "AgentInformation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
