/**
 * Validators for base64 image uploads. Used by /api/photos and /api/me/avatar.
 *
 * - Size cap: 5 MB after base64 decode.
 * - Magic byte check: must be JPG, PNG, WEBP, or GIF (HEIC is intentionally
 *   excluded because we cannot validate via magic bytes the same way).
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export interface ParsedImage {
  ext: string;
  buffer: Buffer;
  mime: string;
}

/**
 * Estimate the decoded size of a base64 data URL without allocating a Buffer.
 * Each base64 character encodes 6 bits → 4 chars = 3 bytes, minus padding.
 */
export function estimateBase64DecodedSize(base64: string): number {
  const len = base64.length;
  if (len === 0) return 0;
  let padding = 0;
  if (base64.endsWith("==")) padding = 2;
  else if (base64.endsWith("=")) padding = 1;
  return Math.ceil((len * 3) / 4) - padding;
}

/** Check leading bytes to confirm the file is actually the claimed type. */
function detectImageType(buf: Buffer): "jpg" | "png" | "webp" | "gif" | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }
  // GIF: "GIF87a" or "GIF89a"
  if (
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return "gif";
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export type ImageError =
  | { ok: false; status: 400; message: string };

export type ImageResult = { ok: true; data: ParsedImage } | ImageError;

/**
 * Parse + validate a base64 data URL image.
 *
 * Returns either a ParsedImage or an error suitable for handing back to the
 * caller as a 400 response.
 */
export function parseAndValidateDataUrl(dataUrl: string): ImageResult {
  const match = /^data:([\w/+.-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return { ok: false, status: 400, message: "Invalid dataUrl" };

  const mime = match[1].toLowerCase();
  const base64 = match[2];

  const decodedSize = estimateBase64DecodedSize(base64);
  if (decodedSize > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      status: 400,
      message: `Image too large (max ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB)`,
    };
  }

  if (!MIME_EXT[mime]) {
    return {
      ok: false,
      status: 400,
      message: "Unsupported image type (allowed: JPG, PNG, WEBP, GIF)",
    };
  }

  const buffer = Buffer.from(base64, "base64");
  const detected = detectImageType(buffer);
  if (!detected) {
    return {
      ok: false,
      status: 400,
      message: "Image content does not match a supported format",
    };
  }

  // If the claimed MIME and the magic-byte detection disagree, trust the
  // bytes (extension follows the real format).
  return { ok: true, data: { ext: detected, buffer, mime } };
}
