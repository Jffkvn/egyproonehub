import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import ConfigError from "@/components/shared/ConfigError";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Egypro Onehub",
  description: "Unified Internal Business Platform for Egypro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text">
        {isSupabaseConfigured ? (
          <AuthProvider>{children}</AuthProvider>
        ) : (
          <ConfigError />
        )}
      </body>
    </html>
  );
}
