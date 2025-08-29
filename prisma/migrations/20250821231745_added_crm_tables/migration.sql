-- CreateTable
CREATE TABLE "CRMAppointmentStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "CRMAppointmentStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMLeads" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "employeeCount" TEXT,
    "companyCount" TEXT,
    "services" TEXT[],
    "isContacted" BOOLEAN NOT NULL DEFAULT false,
    "contactStatus" TEXT,
    "description" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "systemCompanyId" INTEGER NOT NULL,

    CONSTRAINT "CRMLeads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMAppointment" (
    "id" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "cRMLeadsId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "cRMAppointmentStatusId" TEXT NOT NULL,

    CONSTRAINT "CRMAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMembers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "systemCompanyId" INTEGER NOT NULL,

    CONSTRAINT "CompanyMembers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CRMLeads_email_idx" ON "CRMLeads"("email");

-- CreateIndex
CREATE INDEX "CRMLeads_phone_idx" ON "CRMLeads"("phone");

-- CreateIndex
CREATE INDEX "CRMLeads_address_idx" ON "CRMLeads"("address");

-- CreateIndex
CREATE INDEX "CRMLeads_companyName_idx" ON "CRMLeads"("companyName");

-- AddForeignKey
ALTER TABLE "CRMLeads" ADD CONSTRAINT "CRMLeads_systemCompanyId_fkey" FOREIGN KEY ("systemCompanyId") REFERENCES "SystemCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMAppointment" ADD CONSTRAINT "CRMAppointment_cRMLeadsId_fkey" FOREIGN KEY ("cRMLeadsId") REFERENCES "CRMLeads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMAppointment" ADD CONSTRAINT "CRMAppointment_cRMAppointmentStatusId_fkey" FOREIGN KEY ("cRMAppointmentStatusId") REFERENCES "CRMAppointmentStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembers" ADD CONSTRAINT "CompanyMembers_systemCompanyId_fkey" FOREIGN KEY ("systemCompanyId") REFERENCES "SystemCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
