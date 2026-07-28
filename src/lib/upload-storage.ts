import { stat, unlink } from "node:fs/promises";
import path from "node:path";

const LOCAL_UPLOAD_PATTERN =
  /^\/(?:api\/)?uploads\/([a-zA-Z0-9-]+\.(?:jpe?g|png|webp|gif|mp4|mov|webm))(?:\?v=\d+)?$/;
const LOCAL_UPLOAD_FILENAME_PATTERN =
  /^[a-zA-Z0-9-]+\.(?:jpe?g|png|webp|gif|mp4|mov|webm)$/;

export function getLocalUploadFilename(url: string): string | null {
  return LOCAL_UPLOAD_PATTERN.exec(url)?.[1] ?? null;
}

export async function localUploadBytes(
  filenames: ReadonlySet<string>,
): Promise<number> {
  let bytes = 0;
  for (const filename of filenames) {
    if (!LOCAL_UPLOAD_FILENAME_PATTERN.test(filename)) continue;
    const [privateMetadata, legacyMetadata] = await Promise.all([
      stat(
        path.join(process.cwd(), "storage", "uploads", filename),
      ).catch(() => null),
      stat(
        path.join(process.cwd(), "public", "uploads", filename),
      ).catch(() => null),
    ]);
    if (privateMetadata?.isFile()) bytes += privateMetadata.size;
    if (legacyMetadata?.isFile()) bytes += legacyMetadata.size;
  }
  return bytes;
}

/** Remove generated photo files after their database records have been deleted. */
export async function deleteLocalUploadFiles(urls: string[]): Promise<void> {
  const filenames = [...new Set(urls.map(getLocalUploadFilename).filter(Boolean))] as string[];
  await Promise.all(
    filenames.flatMap((filename) => [
      unlink(
        path.join(
          process.cwd(),
          "storage",
          "uploads",
          filename,
        ),
      ).catch(() => undefined),
      unlink(
        path.join(
          process.cwd(),
          "public",
          "uploads",
          filename,
        ),
      ).catch(() => undefined),
    ]),
  );
}
