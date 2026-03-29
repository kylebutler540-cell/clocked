-- AlterTable
ALTER TABLE "users" ADD COLUMN "anon_number" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "users_anon_number_key" ON "users"("anon_number");
