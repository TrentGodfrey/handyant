/**
 * Shared media constants safe for both client and server bundles.
 * Video uploads travel as multipart/form-data (base64 JSON would inflate a
 * phone clip by a third and blow past request-body limits).
 */

// Leave several MB for multipart framing beneath Cloudflare's 100,000,000-byte
// request-body ceiling so oversized clips fail in-app instead of at the proxy.
export const MAX_VIDEO_BYTES = 90 * 1024 * 1024; // 90 MiB
export const MAX_VIDEO_MB = Math.floor(MAX_VIDEO_BYTES / (1024 * 1024));

export type VideoExtension = "mp4" | "mov" | "webm";

export const VIDEO_MIME_EXT: Record<string, VideoExtension> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-quicktime": "mov",
  "video/mov": "mov",
  "video/x-mov": "mov",
  "application/quicktime": "mov",
  "video/webm": "webm",
};

const GENERIC_UPLOAD_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
]);

/**
 * Resolve the video container a browser selected.
 *
 * iOS does not always preserve a useful MIME type when a clip comes from
 * Files, Messages, or a share sheet. In those cases it may report an empty
 * string or application/octet-stream even though the filename is still .mov.
 * The server independently validates container magic bytes, so using the
 * extension as a fallback here does not weaken upload validation.
 */
export function getVideoFileExtension(file: {
  name?: string | null;
  type?: string | null;
}): VideoExtension | null {
  const mime = file.type?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  const mimeExtension = VIDEO_MIME_EXT[mime];
  if (mimeExtension) return mimeExtension;

  const filenameExtension =
    /\.([a-z0-9]+)$/i.exec(file.name?.trim() ?? "")?.[1]?.toLowerCase() ?? "";
  if (
    filenameExtension !== "mp4" &&
    filenameExtension !== "mov" &&
    filenameExtension !== "webm"
  ) {
    return null;
  }

  // Only trust a filename when the browser says this is a video or supplies
  // no meaningful MIME type. A declared image/text file named ".mov" must
  // continue down its normal path and fail the corresponding validation.
  if (mime.startsWith("video/") || GENERIC_UPLOAD_MIME_TYPES.has(mime)) {
    return filenameExtension;
  }
  return null;
}

/** True when an upload URL points at a stored video file. */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(?:mp4|mov|webm)(?:\?[^#]*)?$/i.test(url);
}
