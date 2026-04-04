-- CreateTable
CREATE TABLE IF NOT EXISTS "employer_logos" (
    "place_id" TEXT NOT NULL,
    "domain" TEXT,
    "logo_url" TEXT,
    "logo_last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,

    CONSTRAINT "employer_logos_pkey" PRIMARY KEY ("place_id")
);
