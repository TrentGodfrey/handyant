-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'cancelled', 'paused');

-- CreateEnum
CREATE TYPE "subscription_plan" AS ENUM ('essential', 'pro', 'elite');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('info', 'success', 'warning', 'error', 'booking', 'invoice', 'message', 'review');

-- CreateEnum
CREATE TYPE "todo_priority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('customer', 'tech');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT,
    "password_hash" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'customer',
    "google_id" TEXT,
    "email_verified" BOOLEAN DEFAULT false,
    "password_reset_token" TEXT,
    "password_reset_expires" TIMESTAMPTZ(6),
    "email_verification_token" TEXT,
    "email_verification_expires" TIMESTAMPTZ(6),
    "pending_email" TEXT,
    "last_seen_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "notify_prefs" JSONB,
    "appointment_reminders" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT DEFAULT 'TX',
    "zip" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "notes" TEXT,
    "gate_code" TEXT,
    "wifi_name" TEXT,
    "wifi_password" TEXT,
    "year_built" INTEGER,
    "water_heater_year" INTEGER,
    "panel_amps" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_appliances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "home_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model_number" TEXT,
    "installed_at" TIMESTAMPTZ(6),
    "interval_days" INTEGER,
    "last_serviced_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_appliances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "home_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "phone" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_todos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "home_id" UUID NOT NULL,
    "task" TEXT NOT NULL,
    "description" TEXT,
    "priority" "todo_priority" NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "parts" TEXT,
    "part_status" TEXT,
    "parts_description" TEXT,
    "parts_buyer" TEXT,
    "specialist" BOOLEAN DEFAULT false,
    "has_photo" BOOLEAN DEFAULT false,
    "photo_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "notes" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_todos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "home_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "severity" TEXT DEFAULT 'info',
    "author_id" UUID,
    "author_name" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "sort_order" INTEGER DEFAULT 0,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "home_id" UUID,
    "tech_id" UUID,
    "status" "booking_status" NOT NULL DEFAULT 'pending',
    "scheduled_date" DATE NOT NULL,
    "scheduled_time" TIME(6) NOT NULL,
    "duration_minutes" INTEGER DEFAULT 120,
    "service_type" TEXT DEFAULT 'one_time',
    "description" TEXT,
    "customer_notes" TEXT,
    "tech_notes" TEXT,
    "estimated_cost" DECIMAL(10,2),
    "final_cost" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_categories" (
    "booking_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "booking_categories_pkey" PRIMARY KEY ("booking_id","category_id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN DEFAULT false,
    "notes" TEXT,
    "sort_order" INTEGER DEFAULT 0,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "item" TEXT NOT NULL,
    "qty" INTEGER DEFAULT 1,
    "cost" DECIMAL(10,2),
    "status" TEXT DEFAULT 'needed',

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID,
    "home_id" UUID,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "type" TEXT DEFAULT 'before',
    "uploaded_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "tech_id" UUID NOT NULL,
    "last_message_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT DEFAULT 'text',
    "read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "tech_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "categories" TEXT[],
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "status" "invoice_status" NOT NULL DEFAULT 'draft',
    "sent_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tech_id" UUID NOT NULL,
    "city" TEXT NOT NULL,
    "active" BOOLEAN DEFAULT true,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "service_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "type" "notification_type" NOT NULL DEFAULT 'info',
    "read" BOOLEAN DEFAULT false,
    "link" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "plan" "subscription_plan" NOT NULL DEFAULT 'essential',
    "status" "subscription_status" DEFAULT 'active',
    "started_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ(6),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tech_id" UUID NOT NULL,
    "business_name" TEXT,
    "license_number" TEXT,
    "working_hours" JSONB,
    "notify_prefs" JSONB,
    "bio" TEXT,
    "phone" TEXT,
    "venmo_handle" TEXT,
    "zelle_handle" TEXT,
    "cashapp_handle" TEXT,
    "paypal_email" TEXT,
    "appointment_reminders" JSONB,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_blocks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tech_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "idx_users_password_reset_token" ON "users"("password_reset_token");

-- CreateIndex
CREATE INDEX "idx_users_email_verification_token" ON "users"("email_verification_token");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_users_last_seen_at" ON "users"("last_seen_at");

-- CreateIndex
CREATE INDEX "idx_homes_customer" ON "homes"("customer_id");

-- CreateIndex
CREATE INDEX "idx_home_appliances_home" ON "home_appliances"("home_id");

-- CreateIndex
CREATE INDEX "idx_household_members_home" ON "household_members"("home_id");

-- CreateIndex
CREATE INDEX "idx_home_todos_home" ON "home_todos"("home_id");

-- CreateIndex
CREATE INDEX "idx_home_notes_home" ON "home_notes"("home_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_name_key" ON "service_categories"("name");

-- CreateIndex
CREATE INDEX "idx_bookings_customer" ON "bookings"("customer_id");

-- CreateIndex
CREATE INDEX "idx_bookings_tech" ON "bookings"("tech_id");

-- CreateIndex
CREATE INDEX "idx_bookings_date" ON "bookings"("scheduled_date");

-- CreateIndex
CREATE INDEX "idx_bookings_status" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "idx_photos_booking" ON "photos"("booking_id");

-- CreateIndex
CREATE INDEX "idx_photos_home" ON "photos"("home_id");

-- CreateIndex
CREATE INDEX "idx_conversations_customer" ON "conversations"("customer_id");

-- CreateIndex
CREATE INDEX "idx_conversations_tech" ON "conversations"("tech_id");

-- CreateIndex
CREATE INDEX "idx_messages_convo" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_reviews_tech" ON "reviews"("tech_id");

-- CreateIndex
CREATE INDEX "idx_reviews_booking" ON "reviews"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "idx_invoices_customer" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "idx_invoices_booking" ON "invoices"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_areas_tech_id_city_key" ON "service_areas"("tech_id", "city");

-- CreateIndex
CREATE INDEX "idx_notifications_user_created" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_tech_id_key" ON "business_profiles"("tech_id");

-- CreateIndex
CREATE INDEX "idx_availability_tech" ON "availability_blocks"("tech_id", "start_at");

-- CreateIndex
CREATE INDEX "idx_booking_notes_booking" ON "booking_notes"("booking_id");

-- AddForeignKey
ALTER TABLE "homes" ADD CONSTRAINT "homes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "home_appliances" ADD CONSTRAINT "home_appliances_home_id_fkey" FOREIGN KEY ("home_id") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_home_id_fkey" FOREIGN KEY ("home_id") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "home_todos" ADD CONSTRAINT "home_todos_home_id_fkey" FOREIGN KEY ("home_id") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "home_notes" ADD CONSTRAINT "home_notes_home_id_fkey" FOREIGN KEY ("home_id") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_home_id_fkey" FOREIGN KEY ("home_id") REFERENCES "homes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tech_id_fkey" FOREIGN KEY ("tech_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking_categories" ADD CONSTRAINT "booking_categories_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking_categories" ADD CONSTRAINT "booking_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_home_id_fkey" FOREIGN KEY ("home_id") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tech_id_fkey" FOREIGN KEY ("tech_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tech_id_fkey" FOREIGN KEY ("tech_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_tech_id_fkey" FOREIGN KEY ("tech_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking_notes" ADD CONSTRAINT "booking_notes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking_notes" ADD CONSTRAINT "booking_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
