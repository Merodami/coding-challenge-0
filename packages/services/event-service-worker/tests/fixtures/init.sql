-- Event Service Test Database Schema
-- Generated from Prisma schema for testcontainer integration tests

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE "SellMode" AS ENUM ('online', 'offline', 'both');
CREATE TYPE "SyncStatus" AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'skipped');
CREATE TYPE "EventStatus" AS ENUM ('active', 'inactive', 'deleted');
CREATE TYPE "SyncTrigger" AS ENUM ('scheduled', 'manual', 'webhook', 'startup');

-- Base Plans table
CREATE TABLE "base_plans" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "base_plan_id" VARCHAR(255) UNIQUE NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "organizer_company_id" VARCHAR(255),
    "sell_mode" "SellMode" DEFAULT 'online' NOT NULL,
    "first_seen_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" TIMESTAMPTZ(6)
);

-- Plans table
CREATE TABLE "plans" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "base_plan_id" UUID NOT NULL REFERENCES "base_plans"("id") ON DELETE CASCADE,
    "plan_id" VARCHAR(255) NOT NULL,
    "plan_start_date" TIMESTAMPTZ(6) NOT NULL,
    "plan_end_date" TIMESTAMPTZ(6) NOT NULL,
    "sell_from" TIMESTAMPTZ(6),
    "sell_to" TIMESTAMPTZ(6),
    "sold_out" BOOLEAN DEFAULT false NOT NULL,
    "min_price" DECIMAL(10,2),
    "max_price" DECIMAL(10,2),
    "raw_data" JSONB,
    "first_seen_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    UNIQUE("base_plan_id", "plan_id")
);

-- Zones table
CREATE TABLE "zones" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "plan_id" UUID NOT NULL REFERENCES "plans"("id") ON DELETE CASCADE,
    "zone_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "capacity" INTEGER,
    "price" DECIMAL(10,2) NOT NULL,
    "numbered" BOOLEAN DEFAULT false NOT NULL,
    "first_seen_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Sync History table
CREATE TABLE "sync_history" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "status" "SyncStatus" DEFAULT 'pending' NOT NULL,
    "trigger" "SyncTrigger" DEFAULT 'scheduled' NOT NULL,
    "started_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "events_found" INTEGER,
    "events_created" INTEGER,
    "events_updated" INTEGER,
    "events_deleted" INTEGER,
    "response_time_ms" INTEGER,
    "processing_time_ms" INTEGER,
    "error" TEXT,
    "error_details" JSONB,
    "raw_response" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for performance (matching Prisma schema)
CREATE INDEX "base_plans_sell_mode_idx" ON "base_plans"("sell_mode");
CREATE INDEX "base_plans_last_seen_at_idx" ON "base_plans"("last_seen_at");
CREATE INDEX "base_plans_deleted_at_idx" ON "base_plans"("deleted_at");
CREATE INDEX "base_plans_title_idx" ON "base_plans"("title");

CREATE INDEX "plans_plan_start_date_plan_end_date_idx" ON "plans"("plan_start_date", "plan_end_date");
CREATE INDEX "plans_base_plan_id_idx" ON "plans"("base_plan_id");
CREATE INDEX "plans_deleted_at_idx" ON "plans"("deleted_at");
CREATE INDEX "plans_plan_start_date_idx" ON "plans"("plan_start_date");
CREATE INDEX "plans_plan_end_date_idx" ON "plans"("plan_end_date");

CREATE INDEX "zones_plan_id_idx" ON "zones"("plan_id");

CREATE INDEX "sync_history_status_idx" ON "sync_history"("status");
CREATE INDEX "sync_history_started_at_idx" ON "sync_history"("started_at");
CREATE INDEX "sync_history_trigger_idx" ON "sync_history"("trigger");

-- Insert sample test data for integration tests
INSERT INTO "base_plans" ("base_plan_id", "title", "organizer_company_id", "sell_mode") VALUES
('291', 'Summer Music Festival', '1', 'online'),
('292', 'Art Gallery Opening', '2', 'offline'),
('293', 'Tech Conference 2024', '3', 'online');

INSERT INTO "plans" ("base_plan_id", "plan_id", "plan_start_date", "plan_end_date", "min_price", "max_price") VALUES
((SELECT id FROM "base_plans" WHERE "base_plan_id" = '291'), '291', '2024-07-15T18:00:00Z', '2024-07-15T23:00:00Z', 75.00, 150.00),
((SELECT id FROM "base_plans" WHERE "base_plan_id" = '292'), '292', '2024-07-20T19:00:00Z', '2024-07-20T22:00:00Z', 25.00, 25.00),
((SELECT id FROM "base_plans" WHERE "base_plan_id" = '293'), '293', '2024-08-01T09:00:00Z', '2024-08-01T17:00:00Z', 99.00, 299.00);

INSERT INTO "zones" ("plan_id", "zone_id", "name", "price", "capacity", "numbered") VALUES
((SELECT id FROM "plans" WHERE "plan_id" = '291'), '1', 'General Admission', 75.00, 1000, false),
((SELECT id FROM "plans" WHERE "plan_id" = '291'), '2', 'VIP', 150.00, 100, true),
((SELECT id FROM "plans" WHERE "plan_id" = '292'), '3', 'Standard', 25.00, 200, false),
((SELECT id FROM "plans" WHERE "plan_id" = '293'), '4', 'Early Bird', 99.00, 500, false),
((SELECT id FROM "plans" WHERE "plan_id" = '293'), '5', 'Premium', 299.00, 50, true);