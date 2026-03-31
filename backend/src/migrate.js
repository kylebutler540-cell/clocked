// Direct DB migration using pg package
const { Client } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
  console.log('No DATABASE_URL, skipping migration');
  process.exit(0);
}

async function run() {
  console.log('Running DB migrations...');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    
    const statements = [
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" TEXT`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "follower_count" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "following_count" INTEGER NOT NULL DEFAULT 0`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username")`,
      `CREATE TABLE IF NOT EXISTS "follows" (
        "id" TEXT NOT NULL,
        "follower_id" TEXT NOT NULL,
        "following_id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id")`,
      `DO $$ BEGIN ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "parent_id" TEXT`,
      `ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "image_url" TEXT`,
      `ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "likes" INTEGER NOT NULL DEFAULT 0`,
      `CREATE TABLE IF NOT EXISTS "comment_likes" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "comment_id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "comment_likes_user_id_comment_id_key" ON "comment_likes"("user_id", "comment_id")`,
      `DO $$ BEGIN ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    ];

    for (const stmt of statements) {
      await client.query(stmt);
    }

    console.log('✓ DB migrations applied');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
