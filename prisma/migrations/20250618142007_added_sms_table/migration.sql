-- CreateTable
CREATE TABLE "sms_logs" (
    "id" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "numbers" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "route" INTEGER NOT NULL,
    "status" INTEGER,
    "success" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "charged" DOUBLE PRECISION,
    "apiRaw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "systemCompanyId" INTEGER NOT NULL,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_systemCompanyId_fkey" FOREIGN KEY ("systemCompanyId") REFERENCES "SystemCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
