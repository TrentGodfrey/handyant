-- Task attachments now support validated local MP4, MOV, and WEBM uploads.
-- Preserve the local-only invariant while extending the previously
-- image-only URL allowlist.
ALTER TABLE "photos"
  DROP CONSTRAINT "photos_local_url_only";

ALTER TABLE "photos"
  ADD CONSTRAINT "photos_local_url_only"
  CHECK (
    "url" ~ '^/(api/)?uploads/[A-Za-z0-9-]+\.(jpg|jpeg|png|webp|gif|mp4|mov|webm)$'
  );
