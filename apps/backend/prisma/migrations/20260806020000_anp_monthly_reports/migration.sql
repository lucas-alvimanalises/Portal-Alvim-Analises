-- CreateEnum
CREATE TYPE "AnpReportParameter" AS ENUM ('SILOXANOS', 'FLUORADOS', 'CLORADOS');

-- CreateTable
CREATE TABLE "anp_regulatory_limits" (
    "parameter" "AnpReportParameter" NOT NULL,
    "label" TEXT NOT NULL,
    "regulatoryLimit" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "anp_regulatory_limits_pkey" PRIMARY KEY ("parameter")
);

-- CreateTable
CREATE TABLE "anp_monthly_reports" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "reportNumber" SERIAL NOT NULL,
    "fileId" TEXT NOT NULL,
    "sourceDataHash" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anp_monthly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "anp_monthly_reports_fileId_key" ON "anp_monthly_reports"("fileId");

-- CreateIndex
CREATE INDEX "anp_monthly_reports_clientId_year_month_idx" ON "anp_monthly_reports"("clientId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "anp_monthly_reports_clientId_year_month_version_key" ON "anp_monthly_reports"("clientId", "year", "month", "version");

-- AddForeignKey
ALTER TABLE "anp_regulatory_limits" ADD CONSTRAINT "anp_regulatory_limits_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anp_monthly_reports" ADD CONSTRAINT "anp_monthly_reports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anp_monthly_reports" ADD CONSTRAINT "anp_monthly_reports_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anp_monthly_reports" ADD CONSTRAINT "anp_monthly_reports_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed inicial dos limites regulatórios ANP (RANP 886) — mesmos valores já
-- usados hoje no template genérico de certificados (CertificateAnalyteTemplate
-- de Siloxanos/VOCs), agora numa tabela própria e editável pela tela nova.
INSERT INTO "anp_regulatory_limits" ("parameter", "label", "regulatoryLimit", "unit", "updatedAt") VALUES
    ('SILOXANOS', 'Siloxanos', 0.3, 'mg Si/m³', CURRENT_TIMESTAMP),
    ('FLUORADOS', 'Somatória de Fluorados', 5.0, 'mg F/m³', CURRENT_TIMESTAMP),
    ('CLORADOS', 'Somatória de Clorados', 5.0, 'mg Cl/m³', CURRENT_TIMESTAMP);
