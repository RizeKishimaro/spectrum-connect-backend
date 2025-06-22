-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- CreateTable
CREATE TABLE "crms" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "employeeCount" TEXT NOT NULL,
    "companyCount" TEXT NOT NULL,
    "services" TEXT[],
    "isContacted" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "crmId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crms_email_idx" ON "crms"("email");

-- CreateIndex
CREATE INDEX "crms_phone_idx" ON "crms"("phone");

-- CreateIndex
CREATE INDEX "crms_address_idx" ON "crms"("address");

-- CreateIndex
CREATE INDEX "crms_companyName_idx" ON "crms"("companyName");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_crmId_fkey" FOREIGN KEY ("crmId") REFERENCES "crms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
