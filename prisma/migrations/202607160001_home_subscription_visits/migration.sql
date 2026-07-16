-- Make memberships home-specific and persist visit usage.
ALTER TABLE "subscriptions"
  ADD COLUMN "home_id" UUID,
  ADD COLUMN "visits_used" INTEGER NOT NULL DEFAULT 0;

-- Existing customer-level memberships are attached to the customer's oldest
-- home. Staff can reassign/correct these from the home detail screen.
UPDATE "subscriptions" AS s
SET "home_id" = (
  SELECT "id"
  FROM "homes"
  WHERE "customer_id" = s."customer_id"
  ORDER BY "created_at" ASC NULLS LAST, "id" ASC
  LIMIT 1
)
WHERE s."home_id" IS NULL
  AND EXISTS (
    SELECT 1 FROM "homes" WHERE "customer_id" = s."customer_id"
  );

-- Seed usage from completed work so current customers do not start at zero.
UPDATE "subscriptions" AS s
SET "visits_used" = usage."count"
FROM (
  SELECT s2."id", COUNT(b."id")::INTEGER AS "count"
  FROM "subscriptions" AS s2
  LEFT JOIN "bookings" AS b
    ON b."home_id" = s2."home_id"
    AND b."status" = 'completed'
    AND (s2."started_at" IS NULL OR b."scheduled_date" >= s2."started_at"::date)
    AND (s2."ends_at" IS NULL OR b."scheduled_date" <= s2."ends_at"::date)
  GROUP BY s2."id"
) AS usage
WHERE usage."id" = s."id";

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_home_id_fkey"
  FOREIGN KEY ("home_id") REFERENCES "homes"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "idx_subscriptions_home_status"
  ON "subscriptions"("home_id", "status");

CREATE INDEX "idx_subscriptions_customer_status"
  ON "subscriptions"("customer_id", "status");
