-- CreateTable
CREATE TABLE "DIDNumbers" (
    "id" TEXT NOT NULL,
    "didNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sIPEndpointsId" TEXT,

    CONSTRAINT "DIDNumbers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DIDNumbers" ADD CONSTRAINT "DIDNumbers_sIPEndpointsId_fkey" FOREIGN KEY ("sIPEndpointsId") REFERENCES "SIPEndpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
