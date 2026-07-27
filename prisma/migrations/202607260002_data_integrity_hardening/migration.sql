-- Collapse duplicate customer/staff conversation rows without losing their
-- messages. The oldest conversation is canonical; its activity timestamp is
-- advanced to the latest timestamp recorded by any duplicate.
CREATE TEMP TABLE "_conversation_dedupe" ON COMMIT DROP AS
SELECT
  "id",
  FIRST_VALUE("id") OVER (
    PARTITION BY "customer_id", "tech_id"
    ORDER BY "created_at" ASC NULLS LAST, "id" ASC
  ) AS "keep_id"
FROM "conversations";

UPDATE "conversations" AS keep
SET "last_message_at" = latest."last_message_at"
FROM (
  SELECT mapping."keep_id", MAX(source."last_message_at") AS "last_message_at"
  FROM "_conversation_dedupe" AS mapping
  JOIN "conversations" AS source ON source."id" = mapping."id"
  GROUP BY mapping."keep_id"
) AS latest
WHERE keep."id" = latest."keep_id"
  AND latest."last_message_at" IS NOT NULL;

UPDATE "messages" AS message
SET "conversation_id" = mapping."keep_id"
FROM "_conversation_dedupe" AS mapping
WHERE message."conversation_id" = mapping."id"
  AND mapping."id" <> mapping."keep_id";

DELETE FROM "conversations" AS duplicate
USING "_conversation_dedupe" AS mapping
WHERE duplicate."id" = mapping."id"
  AND mapping."id" <> mapping."keep_id";

CREATE UNIQUE INDEX "conversations_customer_id_tech_id_key"
  ON "conversations"("customer_id", "tech_id");

-- Duplicate reviews can only represent repeated submissions for the same
-- customer and visit. Preserve the earliest submission and remove later rows.
DELETE FROM "reviews" AS duplicate
USING (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "booking_id", "customer_id"
      ORDER BY "created_at" ASC NULLS LAST, "id" ASC
    ) AS "row_number"
  FROM "reviews"
) AS ranked
WHERE duplicate."id" = ranked."id"
  AND ranked."row_number" > 1;

CREATE UNIQUE INDEX "reviews_booking_id_customer_id_key"
  ON "reviews"("booking_id", "customer_id");

-- These records have no valid owner when their referenced user is gone.
-- Removing only true orphans makes the new foreign keys safe to validate.
DELETE FROM "business_profiles" AS profile
WHERE NOT EXISTS (
  SELECT 1 FROM "users" AS owner WHERE owner."id" = profile."tech_id"
);

DELETE FROM "availability_blocks" AS block
WHERE NOT EXISTS (
  SELECT 1 FROM "users" AS owner WHERE owner."id" = block."tech_id"
);

ALTER TABLE "business_profiles"
  ADD CONSTRAINT "business_profiles_tech_id_fkey"
  FOREIGN KEY ("tech_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION
  NOT VALID;

ALTER TABLE "availability_blocks"
  ADD CONSTRAINT "availability_blocks_tech_id_fkey"
  FOREIGN KEY ("tech_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION
  NOT VALID;

ALTER TABLE "business_profiles"
  VALIDATE CONSTRAINT "business_profiles_tech_id_fkey";

ALTER TABLE "availability_blocks"
  VALIDATE CONSTRAINT "availability_blocks_tech_id_fkey";

-- Enforce valid ranges for every new or changed block. Do not rewrite or
-- discard an existing malformed block during deployment; validate immediately
-- only when production contains no conflicts.
ALTER TABLE "availability_blocks"
  ADD CONSTRAINT "availability_blocks_valid_range"
  CHECK ("end_at" > "start_at")
  NOT VALID;

DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM "availability_blocks"
  WHERE "end_at" <= "start_at";

  IF invalid_count = 0 THEN
    EXECUTE 'ALTER TABLE "availability_blocks" VALIDATE CONSTRAINT "availability_blocks_valid_range"';
  ELSE
    RAISE WARNING
      'availability_blocks_valid_range remains NOT VALID because % existing row(s) have end_at <= start_at',
      invalid_count;
  END IF;
END
$$;
