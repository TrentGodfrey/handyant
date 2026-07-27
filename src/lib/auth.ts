import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { PRIVILEGED_SESSION_MAX_AGE_MS } from "./access-control";
import {
  LOGIN_ACCOUNT_ATTEMPT_LIMIT,
  LOGIN_ACCOUNT_WINDOW_MS,
  LOGIN_IP_EMAIL_ATTEMPT_LIMIT,
  LOGIN_IP_EMAIL_WINDOW_MS,
  MAX_PASSWORD_LENGTH,
  credentialRequestIp,
  loginAccountRateLimitKey,
  loginIpEmailRateLimitKey,
  normalizeCredentialEmail,
} from "./login-security";
import { checkRateLimit, resetRateLimit, takeRateLimit } from "./rate-limit";

const providers: NextAuthOptions["providers"] = [];

// Only enable Google OAuth if both env vars are configured.
// Otherwise next-auth crashes the entire /api/auth route with "client_id is required".
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

providers.push(
  CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = normalizeCredentialEmail(credentials.email);
        if (!email) return null;
        const ip = credentialRequestIp(req.headers);
        const ipEmailKey = loginIpEmailRateLimitKey(email, ip);
        const accountKey = loginAccountRateLimitKey(email);
        if (
          !checkRateLimit(ipEmailKey, LOGIN_IP_EMAIL_ATTEMPT_LIMIT).allowed ||
          !checkRateLimit(accountKey, LOGIN_ACCOUNT_ATTEMPT_LIMIT).allowed
        ) return null;
        if (credentials.password.length > MAX_PASSWORD_LENGTH) {
          takeRateLimit(
            ipEmailKey,
            LOGIN_IP_EMAIL_ATTEMPT_LIMIT,
            LOGIN_IP_EMAIL_WINDOW_MS,
          );
          takeRateLimit(
            accountKey,
            LOGIN_ACCOUNT_ATTEMPT_LIMIT,
            LOGIN_ACCOUNT_WINDOW_MS,
          );
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          takeRateLimit(
            ipEmailKey,
            LOGIN_IP_EMAIL_ATTEMPT_LIMIT,
            LOGIN_IP_EMAIL_WINDOW_MS,
          );
          takeRateLimit(
            accountKey,
            LOGIN_ACCOUNT_ATTEMPT_LIMIT,
            LOGIN_ACCOUNT_WINDOW_MS,
          );
          return null;
        }

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) {
          takeRateLimit(
            ipEmailKey,
            LOGIN_IP_EMAIL_ATTEMPT_LIMIT,
            LOGIN_IP_EMAIL_WINDOW_MS,
          );
          takeRateLimit(
            accountKey,
            LOGIN_ACCOUNT_ATTEMPT_LIMIT,
            LOGIN_ACCOUNT_WINDOW_MS,
          );
          return null;
        }
        resetRateLimit(ipEmailKey);
        resetRateLimit(accountKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isAdmin: user.isAdmin,
          sessionVersion: user.sessionVersion,
          mustChangePassword: user.mustChangePassword,
          image: user.avatarUrl,
        };
      },
    })
);

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingByGoogle = await prisma.user.findUnique({
          where: { googleId: account.providerAccountId },
        });

        if (!existingByGoogle) {
          const normalizedEmail = user.email?.trim().toLowerCase() ?? null;
          const existingByEmail = normalizedEmail
            ? await prisma.user.findUnique({ where: { email: normalizedEmail } })
            : null;
          if (existingByEmail?.googleId && existingByEmail.googleId !== account.providerAccountId) {
            return false;
          }

          // Google has proved control of this address. Link the provider to a
          // staff-created customer instead of creating a duplicate account.
          const linked = existingByEmail
            ? await prisma.user.update({
                where: { id: existingByEmail.id },
                data: {
                  googleId: account.providerAccountId,
                  emailVerified: true,
                  avatarUrl: user.image ?? existingByEmail.avatarUrl,
                },
              })
            : await prisma.user.create({
                data: {
                  googleId: account.providerAccountId,
                  email: normalizedEmail,
                  name: user.name ?? "Customer",
                  avatarUrl: user.image,
                  emailVerified: true,
                  role: "customer",
                },
              });
          user.id = linked.id;
          (user as unknown as Record<string, unknown>).role = linked.role;
          (user as unknown as Record<string, unknown>).isAdmin = linked.isAdmin;
          (user as unknown as Record<string, unknown>).sessionVersion = linked.sessionVersion;
          (user as unknown as Record<string, unknown>).mustChangePassword = linked.mustChangePassword;
        } else {
          user.id = existingByGoogle.id;
          (user as unknown as Record<string, unknown>).role = existingByGoogle.role;
          (user as unknown as Record<string, unknown>).isAdmin = existingByGoogle.isAdmin;
          (user as unknown as Record<string, unknown>).sessionVersion = existingByGoogle.sessionVersion;
          (user as unknown as Record<string, unknown>).mustChangePassword = existingByGoogle.mustChangePassword;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isAdmin = user.isAdmin;
        token.sessionVersion = user.sessionVersion;
        token.mustChangePassword = user.mustChangePassword;
        token.privilegedExpiresAt = user.role === "tech"
          ? Date.now() + PRIVILEGED_SESSION_MAX_AGE_MS
          : null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.isAdmin = token.isAdmin;
        session.user.sessionVersion = token.sessionVersion;
        session.user.mustChangePassword = token.mustChangePassword;
        session.user.privilegedExpiresAt = token.privilegedExpiresAt;
      }
      return session;
    },
  },
};
