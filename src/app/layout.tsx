import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import RoleSwitcher from "@/components/RoleSwitcher";
import Providers from "@/components/Providers";
import Toaster from "@/components/Toaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Anthony's Handyman | DFW Home Services",
  description: "Professional handyman services across DFW. Book online, manage your home, track repairs.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Handyman",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background">
        <Providers>
          <RoleSwitcher />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
