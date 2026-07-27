CREATE TABLE "booking_declines" (
  "booking_id" UUID NOT NULL,
  "tech_id" UUID NOT NULL,
  "declined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "booking_declines_pkey" PRIMARY KEY ("booking_id", "tech_id"),
  CONSTRAINT "booking_declines_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "booking_declines_tech_id_fkey"
    FOREIGN KEY ("tech_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_booking_declines_tech"
  ON "booking_declines"("tech_id", "declined_at");
