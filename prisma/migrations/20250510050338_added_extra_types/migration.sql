-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CallStatus" ADD VALUE 'WAITING';
ALTER TYPE "CallStatus" ADD VALUE 'RINGING';
ALTER TYPE "CallStatus" ADD VALUE 'CONNECTED';
ALTER TYPE "CallStatus" ADD VALUE 'HUNGUP';
ALTER TYPE "CallStatus" ADD VALUE 'FAILED';
ALTER TYPE "CallStatus" ADD VALUE 'MISSED';
ALTER TYPE "CallStatus" ADD VALUE 'TRANSFERRED';
