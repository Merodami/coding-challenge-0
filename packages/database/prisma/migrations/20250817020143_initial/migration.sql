-- CreateEnum
CREATE TYPE "public"."SellMode" AS ENUM ('online', 'offline', 'both');

-- CreateEnum
CREATE TYPE "public"."SyncStatus" AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('active', 'inactive', 'deleted');

-- CreateEnum
CREATE TYPE "public"."SyncTrigger" AS ENUM ('scheduled', 'manual', 'webhook', 'startup');

-- CreateTable
CREATE TABLE "public"."base_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "base_plan_id" VARCHAR(255) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "organizer_company_id" VARCHAR(255),
    "sell_mode" "public"."SellMode" NOT NULL DEFAULT 'online',
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "base_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "base_plan_id" UUID NOT NULL,
    "plan_id" VARCHAR(255) NOT NULL,
    "plan_start_date" TIMESTAMPTZ(6) NOT NULL,
    "plan_end_date" TIMESTAMPTZ(6) NOT NULL,
    "sell_from" TIMESTAMPTZ(6),
    "sell_to" TIMESTAMPTZ(6),
    "sold_out" BOOLEAN NOT NULL DEFAULT false,
    "min_price" DECIMAL(10,2),
    "max_price" DECIMAL(10,2),
    "raw_data" JSONB,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_id" UUID NOT NULL,
    "zone_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "capacity" INTEGER,
    "price" DECIMAL(10,2) NOT NULL,
    "numbered" BOOLEAN NOT NULL DEFAULT false,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sync_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "status" "public"."SyncStatus" NOT NULL DEFAULT 'pending',
    "trigger" "public"."SyncTrigger" NOT NULL DEFAULT 'scheduled',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "base_plans_base_plan_id_key" ON "public"."base_plans"("base_plan_id");

-- CreateIndex
CREATE INDEX "base_plans_sell_mode_idx" ON "public"."base_plans"("sell_mode");

-- CreateIndex
CREATE INDEX "base_plans_last_seen_at_idx" ON "public"."base_plans"("last_seen_at");

-- CreateIndex
CREATE INDEX "base_plans_deleted_at_idx" ON "public"."base_plans"("deleted_at");

-- CreateIndex
CREATE INDEX "base_plans_title_idx" ON "public"."base_plans"("title");

-- CreateIndex
CREATE INDEX "plans_plan_start_date_plan_end_date_idx" ON "public"."plans"("plan_start_date", "plan_end_date");

-- CreateIndex
CREATE INDEX "plans_base_plan_id_idx" ON "public"."plans"("base_plan_id");

-- CreateIndex
CREATE INDEX "plans_deleted_at_idx" ON "public"."plans"("deleted_at");

-- CreateIndex
CREATE INDEX "plans_plan_start_date_idx" ON "public"."plans"("plan_start_date");

-- CreateIndex
CREATE INDEX "plans_plan_end_date_idx" ON "public"."plans"("plan_end_date");

-- CreateIndex
CREATE UNIQUE INDEX "plans_base_plan_id_plan_id_key" ON "public"."plans"("base_plan_id", "plan_id");

-- CreateIndex
CREATE INDEX "zones_plan_id_idx" ON "public"."zones"("plan_id");

-- CreateIndex
CREATE INDEX "sync_history_status_idx" ON "public"."sync_history"("status");

-- CreateIndex
CREATE INDEX "sync_history_started_at_idx" ON "public"."sync_history"("started_at");

-- CreateIndex
CREATE INDEX "sync_history_trigger_idx" ON "public"."sync_history"("trigger");

-- AddForeignKey
ALTER TABLE "public"."plans" ADD CONSTRAINT "plans_base_plan_id_fkey" FOREIGN KEY ("base_plan_id") REFERENCES "public"."base_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."zones" ADD CONSTRAINT "zones_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
