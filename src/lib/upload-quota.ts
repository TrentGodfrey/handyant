import "server-only";
import { prisma } from "@/lib/prisma";
import {
  getLocalUploadFilename,
  localUploadBytes,
} from "@/lib/upload-storage";
import {
  DEFAULT_ACCOUNT_UPLOAD_LIMIT_BYTES,
  DEFAULT_GLOBAL_UPLOAD_LIMIT_BYTES,
  uploadQuotaError,
} from "@/lib/upload-quota-policy";

type UploadQuotaState = {
  queue?: Promise<void>;
};

const quotaState = globalThis as typeof globalThis & {
  mcqUploadQuotaState?: UploadQuotaState;
};
quotaState.mcqUploadQuotaState ??= {};

function configuredLimit(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function accountUploadUrls(accountId: string): Promise<string[]> {
  const [photos, messages, account] = await Promise.all([
    prisma.photo.findMany({
      where: {
        OR: [
          { home: { customerId: accountId } },
          { booking: { customerId: accountId } },
        ],
      },
      select: { url: true },
    }),
    prisma.message.findMany({
      where: { senderId: accountId, type: "photo" },
      select: { text: true },
    }),
    prisma.user.findUnique({
      where: { id: accountId },
      select: { avatarUrl: true },
    }),
  ]);
  return [
    ...photos.map((photo) => photo.url),
    ...messages.map((message) => message.text),
    ...(account?.avatarUrl ? [account.avatarUrl] : []),
  ];
}

async function globalUploadUrls(): Promise<string[]> {
  const [photos, messages, accounts] = await Promise.all([
    prisma.photo.findMany({ select: { url: true } }),
    prisma.message.findMany({
      where: { type: "photo" },
      select: { text: true },
    }),
    prisma.user.findMany({
      where: { avatarUrl: { not: null } },
      select: { avatarUrl: true },
    }),
  ]);
  return [
    ...photos.map((photo) => photo.url),
    ...messages.map((message) => message.text),
    ...accounts.flatMap((account) =>
      account.avatarUrl ? [account.avatarUrl] : [],
    ),
  ];
}

async function quotaUsage(
  accountId: string,
  replacingUrls: string[],
): Promise<{ accountBytes: number; globalBytes: number }> {
  const replacingNames = new Set(
    replacingUrls
      .map(getLocalUploadFilename)
      .filter((value): value is string => Boolean(value)),
  );
  const [accountUrls, allUrls] = await Promise.all([
    accountUploadUrls(accountId),
    globalUploadUrls(),
  ]);
  const accountNames = new Set(
    accountUrls
      .map(getLocalUploadFilename)
      .filter(
        (value): value is string =>
          value !== null && !replacingNames.has(value),
      ),
  );
  const globalNames = new Set(
    allUrls
      .map(getLocalUploadFilename)
      .filter((value): value is string => value !== null),
  );
  const [accountBytes, allGlobalBytes, replacedBytes] = await Promise.all([
    localUploadBytes(accountNames),
    localUploadBytes(globalNames),
    replacingNames.size ? localUploadBytes(replacingNames) : Promise.resolve(0),
  ]);
  return {
    accountBytes,
    globalBytes: Math.max(0, allGlobalBytes - replacedBytes),
  };
}

/**
 * Serialize quota check + local file creation inside this app process. The VPS
 * runs one application instance, so this prevents parallel uploads from all
 * passing against the same pre-write filesystem usage.
 */
export async function withUploadQuota<T>(params: {
  accountId: string;
  incomingBytes: number;
  replacingUrls?: string[];
  write: () => Promise<T>;
}): Promise<{ ok: true; value: T } | { ok: false; message: string }> {
  const state = quotaState.mcqUploadQuotaState!;
  const previous = state.queue ?? Promise.resolve();
  let release: () => void = () => {};
  state.queue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;

  try {
    const usage = await quotaUsage(
      params.accountId,
      params.replacingUrls ?? [],
    );
    const message = uploadQuotaError({
      ...usage,
      incomingBytes: params.incomingBytes,
      accountLimitBytes: configuredLimit(
        "MCQ_UPLOAD_ACCOUNT_LIMIT_BYTES",
        DEFAULT_ACCOUNT_UPLOAD_LIMIT_BYTES,
      ),
      globalLimitBytes: configuredLimit(
        "MCQ_UPLOAD_GLOBAL_LIMIT_BYTES",
        DEFAULT_GLOBAL_UPLOAD_LIMIT_BYTES,
      ),
    });
    if (message) return { ok: false, message };
    return { ok: true, value: await params.write() };
  } finally {
    release();
  }
}
