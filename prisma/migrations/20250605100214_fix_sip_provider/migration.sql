/*
  Warnings:

  - You are about to drop the column `AccessToken` on the `SIPProvider` table. All the data in the column will be lost.
  - You are about to drop the column `DIDNumber` on the `SIPProvider` table. All the data in the column will be lost.
  - You are about to drop the column `EndpointName` on the `SIPProvider` table. All the data in the column will be lost.
  - You are about to drop the column `IpHost` on the `SIPProvider` table. All the data in the column will be lost.
  - You are about to drop the column `IpRange` on the `SIPProvider` table. All the data in the column will be lost.
  - You are about to drop the column `SipPassword` on the `SIPProvider` table. All the data in the column will be lost.
  - You are about to drop the column `SipUsername` on the `SIPProvider` table. All the data in the column will be lost.
  - Changed the type of `SipTech` on the `SIPProvider` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "SIPProvider_EndpointName_key";

-- AlterTable
ALTER TABLE "SIPProvider" DROP COLUMN "AccessToken",
DROP COLUMN "DIDNumber",
DROP COLUMN "EndpointName",
DROP COLUMN "IpHost",
DROP COLUMN "IpRange",
DROP COLUMN "SipPassword",
DROP COLUMN "SipUsername",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT,
DROP COLUMN "SipTech",
ADD COLUMN     "SipTech" TEXT NOT NULL,
ALTER COLUMN "CallLimit" DROP DEFAULT;
