import { MAX_VIDEO_BYTES, MAX_VIDEO_MB, VIDEO_MIME_EXT } from "@/lib/media";

// Keep the encoded request comfortably below reverse-proxy limits. A base64
// payload is roughly 33% larger than the original file, so sending a raw 5 MB
// phone photo can exceed an otherwise reasonable request-body limit.
const MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1800;
const DIRECT_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("We couldn't read that photo. Please try another one."));
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This photo format could not be opened. Try choosing a JPG or PNG."));
    };
    image.src = objectUrl;
  });
}

function decodedDataUrlSize(dataUrl: string): number {
  const base64 = dataUrl.split(",", 2)[1] ?? "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.ceil((base64.length * 3) / 4) - padding;
}

/**
 * Keep only genuinely small supported images intact. Normal phone photos and
 * formats such as HEIC are resized and converted to a server-supported JPEG.
 * iOS Safari can decode photos selected from the device library into an Image,
 * even when their source format is HEIC.
 */
export async function prepareImageForUpload(file: File): Promise<string> {
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Please choose an image from your phone.");
  }

  if (DIRECT_UPLOAD_TYPES.has(file.type.toLowerCase()) && file.size <= MAX_UPLOAD_BYTES) {
    return readFileAsDataUrl(file);
  }

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare that photo.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.82, 0.68, 0.52, 0.4]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (decodedDataUrlSize(dataUrl) <= MAX_UPLOAD_BYTES) return dataUrl;
  }
  throw new Error("That photo is still too large. Try a different photo.");
}

export interface UploadTarget {
  homeId?: string | null;
  bookingId?: string | null;
  label?: string | null;
  type?: string;
}

export interface UploadedMedia {
  id: string;
  url: string;
  label: string | null;
  type: string | null;
}

/**
 * Upload a photo or a short video to /api/photos.
 *
 * Photos keep the existing resize-then-JSON-data-URL path. Videos are sent
 * as multipart/form-data because base64 would inflate a phone clip by ~33%.
 */
export async function uploadMediaFile(
  file: File,
  target: UploadTarget,
): Promise<UploadedMedia> {
  if (file.type.toLowerCase().startsWith("video/")) {
    if (!VIDEO_MIME_EXT[file.type.toLowerCase()]) {
      throw new Error("Use an MP4, MOV, or WEBM video.");
    }
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error(`That video is too large (max ${MAX_VIDEO_MB}MB). Try a shorter clip.`);
    }
    const form = new FormData();
    form.append("file", file);
    if (target.homeId) form.append("homeId", target.homeId);
    if (target.bookingId) form.append("bookingId", target.bookingId);
    if (target.label) form.append("label", target.label);
    form.append("type", target.type ?? "general");
    const response = await fetch("/api/photos", { method: "POST", body: form });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.id) {
      throw new Error(body?.error ?? "Video upload failed");
    }
    return body as UploadedMedia;
  }

  const dataUrl = await prepareImageForUpload(file);
  const response = await fetch("/api/photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      homeId: target.homeId ?? undefined,
      bookingId: target.bookingId ?? undefined,
      label: target.label ?? undefined,
      type: target.type ?? "general",
      dataUrl,
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.id) {
    throw new Error(body?.error ?? "Photo upload failed");
  }
  return body as UploadedMedia;
}
