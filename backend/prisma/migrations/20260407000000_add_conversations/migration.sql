-- Add conversation_id to messages (nullable for backward compat)
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "conversation_id" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'sent';

-- Create conversations table
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" TEXT NOT NULL,
  "participant_ids" TEXT[] NOT NULL DEFAULT '{}',
  "last_message" TEXT,
  "last_message_at" TIMESTAMP(3),
  "last_message_sender" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx" ON "messages"("conversation_id");
