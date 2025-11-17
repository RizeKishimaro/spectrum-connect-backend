-- CreateTable
CREATE TABLE "SipSession" (
    "id" SERIAL NOT NULL,
    "callId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SipSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QosReport" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "packetsTransmitted" INTEGER NOT NULL DEFAULT 0,
    "packetsLost" INTEGER NOT NULL DEFAULT 0,
    "jitterMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rttMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mos" DOUBLE PRECISION,
    "reportType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QosReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaOffer" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "sourceIp" TEXT NOT NULL,
    "mediaC_IP" TEXT NOT NULL,
    "mediaM_Port" INTEGER NOT NULL,
    "mediaM_Protocol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SipMessage" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SipMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SipSession_callId_key" ON "SipSession"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "QosReport_sessionId_key" ON "QosReport"("sessionId");

-- CreateIndex
CREATE INDEX "QosReport_sessionId_createdAt_idx" ON "QosReport"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaOffer_sessionId_idx" ON "MediaOffer"("sessionId");

-- AddForeignKey
ALTER TABLE "QosReport" ADD CONSTRAINT "QosReport_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SipSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaOffer" ADD CONSTRAINT "MediaOffer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SipSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SipMessage" ADD CONSTRAINT "SipMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SipSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
