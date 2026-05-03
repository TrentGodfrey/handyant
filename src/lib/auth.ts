import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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
        const existing = await prisma.user.findUnique({
          where: { googleId: account.providerAccountId },
        });

        if (!existing) {
          // Auto-create account on first Google sign-in
          const created = await prisma.user.create({
            data: {
              googleId: account.providerAccountId,
              email: user.email,
              name: user.name ?? "Customer",
              avatarUrl: user.image,
              emailVerified: true,
              role: "customer",
            },
          });
          user.id = created.id;
          (user as unknown as Record<string, unknown>).role = created.role;
        } else {
          user.id = existing.id;
          (user as unknown as Record<string, unknown>).role = existing.role;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};
