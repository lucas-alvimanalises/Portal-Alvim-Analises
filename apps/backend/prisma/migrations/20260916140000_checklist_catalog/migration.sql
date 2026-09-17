-- CreateTable
CREATE TABLE "checklist_sections" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "checklist_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sectionId" TEXT NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checklist_sections_key_key" ON "checklist_sections"("key");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_key_key" ON "checklist_items"("key");

-- CreateIndex
CREATE INDEX "checklist_items_sectionId_idx" ON "checklist_items"("sectionId");

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "checklist_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
