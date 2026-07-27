import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "customer" | "tech";
      isAdmin: boolean;
      sessionVersion: number;
      mustChangePassword: boolean;
      privilegedExpiresAt?: number | null;
    };
  }
  interface User {
    role: "customer" | "tech";
    isAdmin: boolean;
    sessionVersion: number;
    mustChangePassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "customer" | "tech";
    isAdmin: boolean;
    sessionVersion: number;
    mustChangePassword: boolean;
    privilegedExpiresAt?: number | null;
  }
}
