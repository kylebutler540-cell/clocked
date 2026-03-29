// One-shot migration runner using Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Running migrations...');
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "follower_count" INTEGER NOT NULL DEFAULT 0`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "following_count" INTEGER NOT NULL DEFAULT 0`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username")`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "follows" (
        "id" TEXT NOT NULL,
        "follower_id" TEXT NOT NULL,
        "following_id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id")`);
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey"
          FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey"
          FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    console.log('✓ Migrations applied successfully');
  } catch (e) {
    console.error('Migration error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
