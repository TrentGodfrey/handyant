-- Attribute membership usage to the exact booking and subscription that
-- received it. Legacy completed bookings intentionally remain at zero/null so
-- cancelling old history can never decrement an unrelated membership.
ALTER TABLE "bookings"
  ADD COLUMN "usage_subscription_id" UUID,
  ADD COLUMN "usage_applied_units" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_usage_applied_units_nonnegative"
  CHECK ("usage_applied_units" >= 0),
  ADD CONSTRAINT "bookings_usage_attribution_consistent"
  CHECK (
    ("usage_applied_units" = 0 AND "usage_subscription_id" IS NULL)
    OR
    ("usage_applied_units" > 0 AND "usage_subscription_id" IS NOT NULL)
  ),
  ADD CONSTRAINT "bookings_usage_subscription_id_fkey"
  FOREIGN KEY ("usage_subscription_id")
  REFERENCES "subscriptions"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX "idx_bookings_usage_subscription"
  ON "bookings"("usage_subscription_id");
