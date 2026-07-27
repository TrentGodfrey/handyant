import type { Metadata, Viewport } from "next";
import Providers from "@/components/Providers";
import Toaster from "@/components/Toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCQ Property Care | DFW Home Services",
  description: "Meticulous Craftsman Quality. Professional handyman services across DFW. Book online, manage your home, track repairs.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MCQ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-background">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
