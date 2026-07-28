/**
 * Shared media constants safe for both client and server bundles.
 * Video uploads travel as multipart/form-data (base64 JSON would inflate a
 * phone clip by a third and blow past request-body limits).
 */

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_VIDEO_MB = Math.floor(MAX_VIDEO_BYTES / (1024 * 1024));

export const VIDEO_MIME_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

/** True when an upload URL points at a stored video file. */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(?:mp4|mov|webm)(?:\?[^#]*)?$/i.test(url);
}
