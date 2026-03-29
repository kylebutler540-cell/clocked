// One-shot migration runner — runs raw SQL directly
const { Client } = require('pg');

async function runMigrations() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const sql = `
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" TEXT;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "follower_count" INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "following_count" INTEGER NOT NULL DEFAULT 0;

    CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

    CREATE TABLE IF NOT EXISTS "follows" (
      "id" TEXT NOT NULL,
      "follower_id" TEXT NOT NULL,
      "following_id" TEXT NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");
  `;

  await client.query(sql);

  // Add FK constraints only if they don't exist
  const fks = [
    `DO $$ BEGIN
      ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey"
        FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    `DO $$ BEGIN
      ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey"
        FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  ];

  for (const fk of fks) {
    await client.query(fk);
  }

  console.log('✓ Migrations applied');
  await client.end();
}

runMigrations().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
