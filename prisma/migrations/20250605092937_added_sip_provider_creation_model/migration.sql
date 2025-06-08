-- CreateTable
CREATE TABLE "SIPProviderConfig" (
    "id" TEXT NOT NULL,
    "sipProviderId" TEXT NOT NULL,
    "endpoint" JSONB NOT NULL,
    "auth" JSONB NOT NULL,
    "aor" JSONB NOT NULL,
    "identify" JSONB NOT NULL,
    "contact" JSONB NOT NULL,

    CONSTRAINT "SIPProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SIPProviderConfig_sipProviderId_key" ON "SIPProviderConfig"("sipProviderId");

-- AddForeignKey
ALTER TABLE "SIPProviderConfig" ADD CONSTRAINT "SIPProviderConfig_sipProviderId_fkey" FOREIGN KEY ("sipProviderId") REFERENCES "SIPProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
