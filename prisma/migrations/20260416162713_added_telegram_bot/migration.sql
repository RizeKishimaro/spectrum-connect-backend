-- CreateTable
CREATE TABLE "TelegramChat" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "title" TEXT,
    "type" TEXT NOT NULL,
    "systemCompanyId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramChat_chatId_key" ON "TelegramChat"("chatId");

-- AddForeignKey
ALTER TABLE "TelegramChat" ADD CONSTRAINT "TelegramChat_systemCompanyId_fkey" FOREIGN KEY ("systemCompanyId") REFERENCES "SystemCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
