-- CreateEnum
CREATE TYPE "LocalTipCategory" AS ENUM ('FOOD', 'SUPPLIES', 'LODGING', 'OTHER');

-- CreateTable
CREATE TABLE "client_local_tips" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "LocalTipCategory" NOT NULL,
    "address" TEXT,
    "mapsUrl" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_local_tips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_local_tips_clientId_idx" ON "client_local_tips"("clientId");

-- AddForeignKey
ALTER TABLE "client_local_tips" ADD CONSTRAINT "client_local_tips_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_local_tips" ADD CONSTRAINT "client_local_tips_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
