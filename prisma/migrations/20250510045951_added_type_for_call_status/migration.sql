/*
  Warnings:

  - The values [WAITING,RINGING,CONNECTED,HUNGUP,FAILED,MISSED,TRANSFERRED] on the enum `CallStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CallStatus_new" AS ENUM ('CONNECTION_ERROR', 'REQUEST_TIMEOUT', 'SIP_FAILURE_CODE', 'INTERNAL_ERROR', 'BUSY', 'REJECTED', 'REDIRECTED', 'UNAVAILABLE', 'NOT_FOUND', 'ADDRESS_INCOMPLETE', 'INCOMPATIBLE_SDP', 'MISSING_SDP', 'AUTHENTICATION_ERROR', 'BYE', 'WEBRTC_ERROR', 'CANCELED', 'NO_ANSWER', 'EXPIRES', 'NO_ACK', 'DIALOG_ERROR', 'USER_DENIED_MEDIA_ACCESS', 'BAD_MEDIA_DESCRIPTION', 'RTP_TIMEOUT');
ALTER TABLE "CallLog" ALTER COLUMN "status" TYPE "CallStatus_new" USING ("status"::text::"CallStatus_new");
ALTER TABLE "CallSession" ALTER COLUMN "status" TYPE "CallStatus_new" USING ("status"::text::"CallStatus_new");
ALTER TYPE "CallStatus" RENAME TO "CallStatus_old";
ALTER TYPE "CallStatus_new" RENAME TO "CallStatus";
DROP TYPE "CallStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "profilePicture" TEXT;
