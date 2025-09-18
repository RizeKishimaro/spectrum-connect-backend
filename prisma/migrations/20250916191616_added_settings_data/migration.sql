-- CreateTable
CREATE TABLE "public"."SIPEndpoints" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "ipHost" TEXT NOT NULL DEFAULT '0.0.0.0',
    "sipTech" TEXT NOT NULL DEFAULT 'pjsip',

    CONSTRAINT "SIPEndpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Extensions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Settings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "blastCount" INTEGER NOT NULL DEFAULT 2,
    "callLimit" INTEGER NOT NULL DEFAULT 100,
    "introFileUrl" TEXT,
    "sipProviderId" TEXT,
    "systemCompanyId" INTEGER NOT NULL,
    "ivrId" TEXT,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Settings" ADD CONSTRAINT "Settings_sipProviderId_fkey" FOREIGN KEY ("sipProviderId") REFERENCES "public"."SIPEndpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Settings" ADD CONSTRAINT "Settings_systemCompanyId_fkey" FOREIGN KEY ("systemCompanyId") REFERENCES "public"."SystemCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Settings" ADD CONSTRAINT "Settings_ivrId_fkey" FOREIGN KEY ("ivrId") REFERENCES "public"."Extensions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
