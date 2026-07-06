import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { GlobalCanvas } from "@/components/3d/GlobalCanvas";
import SentientObserverWrapper from "@/components/utils/SentientObserverWrapper";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-black overflow-x-hidden`}>
        {/* Global Sentient Canvas Layer */}
        <div className="fixed inset-0 z-[1] pointer-events-none">
          <GlobalCanvas />
        </div>
        
        {/* Main Content Layer */}
        <SentientObserverWrapper>
          <main className="relative z-[2] w-full bg-transparent">
            {children}
          </main>
        </SentientObserverWrapper>
      </body>
    </html>
  );
}

