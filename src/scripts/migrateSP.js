/**
 * Migration: Add Single-Player AI Competition columns
 * Adds new columns to worlds and world_memberships tables
 * Safe to run multiple times (uses IF NOT EXISTS / checks before adding)
 */
require('dotenv').config();
const sequelize = require('../config/database');

async function migrate() {
  try {
    console.log('Starting SP migration...\n');

    // --- worlds table ---
    console.log('=== worlds table ===');

    // 1. Create ENUM types if they don't exist
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."enum_worlds_world_type" AS ENUM('multiplayer', 'singleplayer');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('  ENUM enum_worlds_world_type: OK');

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."enum_worlds_difficulty" AS ENUM('easy', 'medium', 'hard');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('  ENUM enum_worlds_difficulty: OK');

    // 2. Add columns if they don't exist
    await safeAddColumn('worlds', 'world_type', `"public"."enum_worlds_world_type" DEFAULT 'multiplayer'`);
    await safeAddColumn('worlds', 'difficulty', `"public"."enum_worlds_difficulty"`);
    await safeAddColumn('worlds', 'owner_user_id', `UUID REFERENCES users(id)`);

    // --- world_memberships table ---
    console.log('\n=== world_memberships table ===');

    await safeAddColumn('world_memberships', 'is_ai', `BOOLEAN DEFAULT false NOT NULL`);
    await safeAddColumn('world_memberships', 'ai_personality', `VARCHAR(255)`);
    await safeAddColumn('world_memberships', 'ai_last_decision_time', `TIMESTAMP WITH TIME ZONE`);

    // Make user_id nullable (for AI airlines)
    try {
      await sequelize.query(`ALTER TABLE "world_memberships" ALTER COLUMN "user_id" DROP NOT NULL;`);
      console.log('  user_id: made nullable');
    } catch (err) {
      // Already nullable or column doesn't have NOT NULL
      console.log('  user_id: already nullable (or skipped)');
    }

    // --- notifications table (create if not exists) ---
    console.log('\n=== notifications table ===');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "world_membership_id" UUID NOT NULL REFERENCES "world_memberships"("id"),
        "type" VARCHAR(255) NOT NULL,
        "icon" VARCHAR(255) DEFAULT 'plane',
        "title" VARCHAR(255) NOT NULL,
        "message" TEXT NOT NULL,
        "link" VARCHAR(255),
        "priority" INTEGER DEFAULT 3,
        "is_read" BOOLEAN DEFAULT false,
        "game_time" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('  notifications table: OK');

    // Add indexes if they don't exist
    await safeCreateIndex('notifications', 'notifications_world_membership_id', 'world_membership_id');
    await safeCreateIndex('notifications', 'notifications_is_read', 'is_read');

    console.log('\n✓ SP migration completed successfully');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

async function safeAddColumn(table, column, definition) {
  try {
    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = '${table}' AND column_name = '${column}' AND table_schema = 'public'
    `);

    if (results.length > 0) {
      console.log(`  ${column}: already exists`);
      return;
    }

    await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition};`);
    console.log(`  ${column}: added`);
  } catch (err) {
    console.error(`  ${column}: ERROR - ${err.message}`);
  }
}

async function safeCreateIndex(table, indexName, columns) {
  try {
    await sequelize.query(`CREATE INDEX IF NOT EXISTS "${indexName}" ON "${table}" (${columns});`);
    console.log(`  index ${indexName}: OK`);
  } catch (err) {
    console.log(`  index ${indexName}: already exists or skipped`);
  }
}

migrate();
