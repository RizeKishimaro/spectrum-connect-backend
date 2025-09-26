-- CreateTable
CREATE TABLE "CheckInOut" (
    "id" TEXT NOT NULL,
    "checkedInTime" TIMESTAMP(3) NOT NULL,
    "checkedOutTime" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInOut_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CheckInOut" ADD CONSTRAINT "CheckInOut_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
