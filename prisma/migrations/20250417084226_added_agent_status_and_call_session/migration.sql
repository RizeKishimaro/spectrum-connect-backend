-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('AVAILABLE', 'RINGING', 'BUSY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('WAITING', 'RINGING', 'CONNECTED', 'HUNGUP');

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sipUri" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSession" (
    "id" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "status" "CallStatus" NOT NULL,
    "assignedAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id")
);
