-- CreateTable
CREATE TABLE "company_ratings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_ratings_place_id_idx" ON "company_ratings"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_ratings_user_id_place_id_key" ON "company_ratings"("user_id", "place_id");

-- AddForeignKey
ALTER TABLE "company_ratings" ADD CONSTRAINT "company_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
