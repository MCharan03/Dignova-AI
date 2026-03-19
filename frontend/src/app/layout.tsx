import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Dignova AI - Admin Dashboard",
  description: "AI Emergency Call Simulation & Hospital Admin Platform",
};

import { GlobalCanvas } from "@/components/3d/GlobalCanvas";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-black overflow-x-hidden`}>
        {/* Global Sentient Canvas Layer - Now background-only */}
        <GlobalCanvas />
        
        {/* Main Content Layer - Stable and standard for Next.js Router */}
        <main className="relative z-10 w-full">
          {children}
        </main>
      </body>
    </html>
  );
}

