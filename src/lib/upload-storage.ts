import { unlink } from "node:fs/promises";
import path from "node:path";

const LOCAL_UPLOAD_PATTERN = /^\/(?:api\/)?uploads\/([a-zA-Z0-9-]+\.(?:jpe?g|png|webp|gif))$/;

export function getLocalUploadFilename(url: string): string | null {
  return LOCAL_UPLOAD_PATTERN.exec(url)?.[1] ?? null;
}

/** Remove generated photo files after their database records have been deleted. */
export async function deleteLocalUploadFiles(urls: string[]): Promise<void> {
  const filenames = [...new Set(urls.map(getLocalUploadFilename).filter(Boolean))] as string[];
  await Promise.all(
    filenames.flatMap((filename) => [
      unlink(path.join(process.cwd(), "storage", "uploads", filename)).catch(() => undefined),
      unlink(path.join(process.cwd(), "public", "uploads", filename)).catch(() => undefined),
    ]),
  );
}
