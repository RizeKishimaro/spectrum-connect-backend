-- CreateTable
CREATE TABLE "ParkedCall" (
    "id" TEXT NOT NULL,
    "sipChannel" TEXT NOT NULL,
    "parkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unparkedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "agentId" TEXT,
    "sIPProviderId" TEXT,
    "DIDNumber" TEXT,
    "systemCompanyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkedCall_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ParkedCall" ADD CONSTRAINT "ParkedCall_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkedCall" ADD CONSTRAINT "ParkedCall_sIPProviderId_fkey" FOREIGN KEY ("sIPProviderId") REFERENCES "SIPProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkedCall" ADD CONSTRAINT "ParkedCall_systemCompanyId_fkey" FOREIGN KEY ("systemCompanyId") REFERENCES "SystemCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
