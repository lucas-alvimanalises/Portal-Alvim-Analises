-- Reverte Schedule.trackingCode (pedido do usuário: rastreio vira uma
-- entidade própria, não presa a um agendamento) — nunca chegou a ser usado
-- em produção antes desta troca.
ALTER TABLE "schedules" DROP COLUMN "trackingCode";

CREATE TYPE "TrackingShipmentStatus" AS ENUM ('IN_TRANSIT', 'DELIVERED');

CREATE TABLE "tracking_shipments" (
    "id" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TrackingShipmentStatus" NOT NULL DEFAULT 'IN_TRANSIT',
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracking_shipments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tracking_shipments_status_idx" ON "tracking_shipments"("status");

ALTER TABLE "tracking_shipments" ADD CONSTRAINT "tracking_shipments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
