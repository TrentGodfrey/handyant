import { randomBytes } from "node:crypto";
import { hashSecurityToken } from "./security-tokens";

export const HOME_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createHomeInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashHomeInviteToken(token: string): string {
  return hashSecurityToken(token);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
