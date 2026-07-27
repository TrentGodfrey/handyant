-- A booking must never point at a home owned by a different customer. Preserve
-- any legacy booking history while removing only the unsafe cross-customer
-- link before enforcing the invariant for all future writes.
DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM "bookings" AS booking
  JOIN "homes" AS home ON home."id" = booking."home_id"
  WHERE booking."customer_id" <> home."customer_id";

  IF mismatch_count > 0 THEN
    RAISE WARNING
      'Clearing home_id on % booking(s) whose customer did not own the linked home',
      mismatch_count;
  END IF;
END
$$;

UPDATE "bookings" AS booking
SET "home_id" = NULL
FROM "homes" AS home
WHERE booking."home_id" = home."id"
  AND booking."customer_id" <> home."customer_id";

CREATE UNIQUE INDEX "homes_id_customer_id_key"
  ON "homes"("id", "customer_id");

ALTER TABLE "bookings"
  DROP CONSTRAINT "bookings_home_id_fkey";

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_home_id_customer_id_fkey"
  FOREIGN KEY ("home_id", "customer_id")
  REFERENCES "homes"("id", "customer_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- The retired endpoint previously accepted arbitrary remote photo URLs.
-- Remove unsafe/non-owned references before locking Photo rows to canonical
-- local uploads created by the validated upload API.
DO $$
DECLARE
  unsafe_photo_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unsafe_photo_count
  FROM "photos"
  WHERE ("booking_id" IS NULL AND "home_id" IS NULL)
     OR "url" !~ '^/(api/)?uploads/[A-Za-z0-9-]+\.(jpg|jpeg|png|webp|gif)$';

  IF unsafe_photo_count > 0 THEN
    RAISE WARNING
      'Removing % legacy photo record(s) without a canonical local upload',
      unsafe_photo_count;
  END IF;
END
$$;

DELETE FROM "photos"
WHERE ("booking_id" IS NULL AND "home_id" IS NULL)
   OR "url" !~ '^/(api/)?uploads/[A-Za-z0-9-]+\.(jpg|jpeg|png|webp|gif)$';

ALTER TABLE "photos"
  ADD CONSTRAINT "photos_has_owner"
  CHECK ("booking_id" IS NOT NULL OR "home_id" IS NOT NULL);

ALTER TABLE "photos"
  ADD CONSTRAINT "photos_local_url_only"
  CHECK ("url" ~ '^/(api/)?uploads/[A-Za-z0-9-]+\.(jpg|jpeg|png|webp|gif)$');
