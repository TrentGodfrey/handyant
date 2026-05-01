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
  title: "MCQ Home Co. | DFW Home Services",
  description: "Meticulous Craftsman Quality. Professional handyman services across DFW. Book online, manage your home, track repairs.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MCQ Home",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
