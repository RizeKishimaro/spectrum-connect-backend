-- CreateTable
CREATE TABLE "AgentPJSIPConfig" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "endpoint" JSONB NOT NULL,
    "auth" JSONB NOT NULL,
    "aor" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentPJSIPConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentPJSIPConfig_agentId_key" ON "AgentPJSIPConfig"("agentId");

-- AddForeignKey
ALTER TABLE "AgentPJSIPConfig" ADD CONSTRAINT "AgentPJSIPConfig_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
