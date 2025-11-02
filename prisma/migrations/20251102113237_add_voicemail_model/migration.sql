-- CreateTable
CREATE TABLE "Voicemail" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "mailbox" TEXT NOT NULL,
    "callerId" TEXT,
    "duration" INTEGER,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isNew" BOOLEAN NOT NULL DEFAULT true,
    "systemCompanyId" INTEGER,

    CONSTRAINT "Voicemail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Voicemail_agentId_idx" ON "Voicemail"("agentId");

-- CreateIndex
CREATE INDEX "Voicemail_systemCompanyId_idx" ON "Voicemail"("systemCompanyId");

-- AddForeignKey
ALTER TABLE "Voicemail" ADD CONSTRAINT "Voicemail_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voicemail" ADD CONSTRAINT "Voicemail_systemCompanyId_fkey" FOREIGN KEY ("systemCompanyId") REFERENCES "SystemCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
