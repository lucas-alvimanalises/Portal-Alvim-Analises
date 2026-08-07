-- CreateTable
CREATE TABLE "client_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_users_pkey" PRIMARY KEY ("id")
);

-- Preserve existing single-client links (users.clientId) before dropping the column
INSERT INTO "client_users" ("id", "userId", "clientId", "createdAt")
SELECT gen_random_uuid(), "id", "clientId", CURRENT_TIMESTAMP
FROM "users"
WHERE "clientId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_clientId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "clientId";

-- CreateIndex
CREATE UNIQUE INDEX "client_users_userId_clientId_key" ON "client_users"("userId", "clientId");

-- AddForeignKey
ALTER TABLE "client_users" ADD CONSTRAINT "client_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_users" ADD CONSTRAINT "client_users_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
