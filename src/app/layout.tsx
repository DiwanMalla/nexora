import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexora — AI Agentic Search & Action",
  description: "One platform. Every AI. Search → Action.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
        <body className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)] antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
