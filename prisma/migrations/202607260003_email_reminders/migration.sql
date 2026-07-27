CREATE TABLE "reminder_deliveries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "booking_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "lead_time_minutes" INTEGER NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'email',
  "appointment_at" TIMESTAMPTZ(6) NOT NULL,
  "claimed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempt_count" INTEGER NOT NULL DEFAULT 1,
  "sent_at" TIMESTAMPTZ(6),
  "failed_at" TIMESTAMPTZ(6),
  "provider_message_id" TEXT,
  "error" TEXT,

  CONSTRAINT "reminder_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reminder_deliveries_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "reminder_deliveries_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "reminder_deliveries_lead_time_positive"
    CHECK ("lead_time_minutes" > 0),
  CONSTRAINT "reminder_deliveries_channel_email"
    CHECK ("channel" = 'email'),
  CONSTRAINT "reminder_deliveries_attempt_count_positive"
    CHECK ("attempt_count" > 0)
);

CREATE UNIQUE INDEX "reminder_deliveries_booking_user_lead_channel_appointment_key"
  ON "reminder_deliveries"(
    "booking_id",
    "user_id",
    "lead_time_minutes",
    "channel",
    "appointment_at"
  );

CREATE INDEX "idx_reminder_deliveries_claimed"
  ON "reminder_deliveries"("claimed_at");

CREATE INDEX "idx_reminder_deliveries_user_sent"
  ON "reminder_deliveries"("user_id", "sent_at");
