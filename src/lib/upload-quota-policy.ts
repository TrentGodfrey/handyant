export const DEFAULT_ACCOUNT_UPLOAD_LIMIT_BYTES = 250 * 1024 * 1024;
export const DEFAULT_GLOBAL_UPLOAD_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;

export function uploadQuotaError(params: {
  accountBytes: number;
  globalBytes: number;
  incomingBytes: number;
  accountLimitBytes?: number;
  globalLimitBytes?: number;
}): string | null {
  const accountLimit =
    params.accountLimitBytes ?? DEFAULT_ACCOUNT_UPLOAD_LIMIT_BYTES;
  const globalLimit =
    params.globalLimitBytes ?? DEFAULT_GLOBAL_UPLOAD_LIMIT_BYTES;
  if (params.accountBytes + params.incomingBytes > accountLimit) {
    return "This account has reached its photo storage limit. Delete older photos or contact MCQ.";
  }
  if (params.globalBytes + params.incomingBytes > globalLimit) {
    return "MCQ photo storage is temporarily full. Please contact MCQ before uploading more photos.";
  }
  return null;
}
