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
      // Messages + Conversations
      `CREATE TABLE IF NOT EXISTS "conversations" (
        "id" TEXT NOT NULL,
        "participant_ids" TEXT[] NOT NULL DEFAULT '{}',
        "last_message" TEXT,
        "last_message_at" TIMESTAMP(3),
        "last_message_sender" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "messages" (
        "id" TEXT NOT NULL,
        "conversation_id" TEXT,
        "sender_id" TEXT NOT NULL,
        "recipient_id" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "read" BOOLEAN NOT NULL DEFAULT false,
        "status" TEXT NOT NULL DEFAULT 'sent',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE INDEX IF NOT EXISTS "messages_recipient_id_idx" ON "messages"("recipient_id")`,
      `CREATE INDEX IF NOT EXISTS "messages_sender_id_idx" ON "messages"("sender_id")`,
      `CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx" ON "messages"("conversation_id")`,
      `DO $$ BEGIN ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      // Add missing columns if upgrading
      `ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "conversation_id" TEXT`,
      `ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'sent'`,
      // Employer coordinates for distance calculation
      `ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "employer_lat" DOUBLE PRECISION`,
      `ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "employer_lng" DOUBLE PRECISION`,
      // Polls
      `CREATE TABLE IF NOT EXISTS "polls" (
        "id" TEXT NOT NULL,
        "post_id" TEXT NOT NULL,
        "question" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "poll_options" (
        "id" TEXT NOT NULL,
        "poll_id" TEXT NOT NULL,
        "text" TEXT NOT NULL,
        "position" INTEGER NOT NULL,
        "vote_count" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "poll_votes" (
        "id" TEXT NOT NULL,
        "poll_id" TEXT NOT NULL,
        "poll_option_id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "polls_post_id_key" ON "polls"("post_id")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "poll_votes_poll_id_user_id_key" ON "poll_votes"("poll_id", "user_id")`,
      `CREATE INDEX IF NOT EXISTS "poll_votes_poll_id_idx" ON "poll_votes"("poll_id")`,
      `DO $$ BEGIN ALTER TABLE "polls" ADD CONSTRAINT "polls_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_option_id_fkey" FOREIGN KEY ("poll_option_id") REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
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
