const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2000;
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
 * Keep already-supported small images intact. Large phone photos and formats
 * such as HEIC are resized and converted to a server-supported JPEG.
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

  for (const quality of [0.84, 0.7, 0.55]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (decodedDataUrlSize(dataUrl) <= MAX_UPLOAD_BYTES) return dataUrl;
  }
  throw new Error("That photo is still too large. Try a different photo.");
}
