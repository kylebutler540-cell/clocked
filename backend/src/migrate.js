// Direct SQL migration — no Prisma client (avoids schema mismatch on startup)
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// Parse DATABASE_URL and run SQL via psql or node-postgres fallback
const url = process.env.DATABASE_URL;
if (!url) {
  console.log('No DATABASE_URL, skipping migration');
  process.exit(0);
}

const sql = [
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" TEXT`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "follower_count" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "following_count" INTEGER NOT NULL DEFAULT 0`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username")`,
  `CREATE TABLE IF NOT EXISTS "follows" ("id" TEXT NOT NULL, "follower_id" TEXT NOT NULL, "following_id" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "follows_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id")`,
  `DO $$ BEGIN ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
].join(';\n') + ';';

try {
  // Try psql first (available in Railway nixpacks)
  execSync(`psql "${url}" -c "${sql.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  console.log('✓ Migrations applied via psql');
} catch (e) {
  // psql not available — write SQL to temp file and run
  try {
    const fs = require('fs');
    fs.writeFileSync('/tmp/migrate.sql', sql);
    execSync(`psql "${url}" -f /tmp/migrate.sql`, { stdio: 'inherit' });
    console.log('✓ Migrations applied via psql -f');
  } catch (e2) {
    console.log('psql not available, skipping migration (will use prisma migrate):', e2.message.slice(0, 100));
  }
}
