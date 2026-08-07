-- CreateEnum
CREATE TYPE "CertificateResultsMode" AS ENUM ('PER_ANALYTE', 'COLLAPSE_BELOW_LQ');

-- AlterTable
ALTER TABLE "certificate_analyte_templates" ADD COLUMN     "collapsedResultLabel" TEXT,
ADD COLUMN     "resultsMode" "CertificateResultsMode" NOT NULL DEFAULT 'PER_ANALYTE';
