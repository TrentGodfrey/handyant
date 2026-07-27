-- Separate business-owner authority from ordinary technician access and make
-- existing JWT sessions revocable after security-sensitive account changes.
ALTER TABLE "users"
  ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- Promote only the known existing owner account. All other technicians remain
-- operational staff and do not gain destructive or business-setting access.
UPDATE "users"
SET "is_admin" = true,
    "must_change_password" = true,
    "session_version" = "session_version" + 1
WHERE LOWER("email") = 'anthony@handyant.com'
  AND "role" = 'tech';
