import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";

function encryptionKey(): Buffer {
  const encoded = process.env.DATA_ENCRYPTION_KEY;
  if (!encoded) throw new Error("DATA_ENCRYPTION_KEY is not configured");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes encoded as base64");
  return key;
}
export function isEncryptedSensitiveValue(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(PREFIX));
}

export function encryptSensitiveValue(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (isEncryptedSensitiveValue(value)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function decryptSensitiveValue(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (!isEncryptedSensitiveValue(value)) return value;
  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 3) throw new Error("Encrypted value has an invalid format");
  const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function decryptHomeAccess<T extends { gateCode?: string | null; wifiPassword?: string | null }>(home: T): T {
  return {
    ...home,
    gateCode: decryptSensitiveValue(home.gateCode),
    wifiPassword: decryptSensitiveValue(home.wifiPassword),
  };
}
