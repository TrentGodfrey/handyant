-- A legacy photo could reference both a home and an unrelated booking. Keep
-- the home-owned record but remove the unsafe booking association. Validated
-- uploads already require both references to identify the same customer/home.
UPDATE "photos" AS photo
SET "booking_id" = NULL
FROM "bookings" AS booking, "homes" AS home
WHERE photo."booking_id" = booking."id"
  AND photo."home_id" = home."id"
  AND (
    booking."home_id" IS DISTINCT FROM photo."home_id"
    OR booking."customer_id" <> home."customer_id"
  );

-- Home tasks store photo identifiers in a legacy UUID array. Remove dangling
-- or cross-home identifiers after the photo cleanup so task responses cannot
-- retain misleading "has photo" state.
WITH cleaned AS (
  SELECT
    todo."id",
    COALESCE(
      ARRAY_AGG(photo."id") FILTER (WHERE photo."id" IS NOT NULL),
      ARRAY[]::UUID[]
    ) AS "photo_ids"
  FROM "home_todos" AS todo
  LEFT JOIN LATERAL UNNEST(todo."photo_ids") AS requested("photo_id") ON true
  LEFT JOIN "photos" AS photo
    ON photo."id" = requested."photo_id"
   AND photo."home_id" = todo."home_id"
  GROUP BY todo."id"
)
UPDATE "home_todos" AS todo
SET
  "photo_ids" = cleaned."photo_ids",
  "has_photo" = CARDINALITY(cleaned."photo_ids") > 0
FROM cleaned
WHERE todo."id" = cleaned."id";
